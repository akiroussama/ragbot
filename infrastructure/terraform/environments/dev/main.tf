terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
  
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = "development"
      Project     = "chatbot-rag"
      ManagedBy   = "terraform"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

module "network" {
  source = "../../modules/network"
  
  environment = "dev"
  vpc_cidr    = "10.0.0.0/16"
}

module "database" {
  source = "../../modules/database"
  
  environment           = "dev"
  db_instance_class    = "db.t3.micro"
  allocated_storage    = 20
  multi_az             = false
  backup_retention_days = 1
  
  vpc_id             = module.network.vpc_id
  database_subnet_ids = module.network.database_subnet_ids
  
  database_name     = "chatbot_rag_dev"
  database_username = "chatbot_dev"
  database_password = var.db_password
}

module "redis" {
  source = "../../modules/redis"
  
  environment      = "dev"
  node_type        = "cache.t3.micro"
  num_cache_nodes  = 1
  
  vpc_id          = module.network.vpc_id
  cache_subnet_ids = module.network.cache_subnet_ids
}

module "storage" {
  source = "../../modules/storage"
  
  environment = "dev"
  
  buckets = {
    uploads = {
      versioning = false
      lifecycle_rules = []
    }
  }
}

output "database_endpoint" {
  value = module.database.endpoint
}

output "redis_endpoint" {
  value = module.redis.endpoint
}

output "s3_buckets" {
  value = module.storage.bucket_names
}