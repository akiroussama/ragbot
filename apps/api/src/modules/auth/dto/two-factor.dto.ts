import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class Verify2FADto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}