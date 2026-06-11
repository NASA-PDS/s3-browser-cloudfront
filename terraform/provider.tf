# ---------- TERRAFORM BACKEND ----------
terraform {
  backend "s3" {}
}

# AWS Provider Configuration
provider "aws" {
  region  = var.aws_region
}
data "aws_caller_identity" "current" {}