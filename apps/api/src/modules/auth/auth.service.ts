import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { prisma, User } from '@chatbot-rag/database';
import { hashSync, compareSync } from 'bcryptjs';
import { randomBytes } from 'crypto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.passwordHash && compareSync(password, user.passwordHash)) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    if (user.twoFactorEnabled) {
      return {
        requiresTwoFactor: true,
        userId: user.id,
      };
    }

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.username) {
      const existingUsername = await this.usersService.findByUsername(dto.username);
      if (existingUsername) {
        throw new ConflictException('Username already taken');
      }
    }

    const passwordHash = hashSync(dto.password, 10);
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        role: 'user',
      },
    });

    const verificationToken = randomBytes(32).toString('hex');
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        type: 'email_verification',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // TODO: Send verification email

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const refreshTokenRecord = await prisma.refreshToken.findFirst({
      where: {
        userId,
        token: refreshToken,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, twoFactorSecret, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, dto: any) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        username: dto.username,
      },
    });

    const { passwordHash, twoFactorSecret, ...profile } = user;
    return profile;
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = randomBytes(32).toString('hex');
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send password reset email

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        type: 'password_reset',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = hashSync(newPassword, 10);
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { passwordHash },
    });

    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return { message: 'Password reset successfully' };
  }

  async verifyEmail(token: string) {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        type: 'email_verification',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired token');
    }

    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { isVerified: true },
    });

    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    await prisma.verificationToken.deleteMany({
      where: {
        userId,
        type: 'email_verification',
      },
    });

    const verificationToken = randomBytes(32).toString('hex');
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        type: 'email_verification',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // TODO: Send verification email

    return { message: 'Verification email sent' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    if (!compareSync(currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = hashSync(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async enable2FA(userId: string, password: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    if (!compareSync(password, user.passwordHash)) {
      throw new UnauthorizedException('Password is incorrect');
    }

    const secret = speakeasy.generateSecret({
      name: `Chatbot RAG (${user.email})`,
      issuer: 'Chatbot RAG',
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  async disable2FA(userId: string, password: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    if (!compareSync(password, user.passwordHash)) {
      throw new UnauthorizedException('Password is incorrect');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return { message: '2FA disabled successfully' };
  }

  async verify2FA(userId: string, code: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new NotFoundException('User not found or 2FA not enabled');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    if (!user.twoFactorEnabled) {
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });
  }
}