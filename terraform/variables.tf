variable "aws_region" {
  description = "The AWS region to deploy in"
  type        = string
  default     = "us-west-2"
}

variable "partition" {
  type    = string
  default = "aws"
}

variable "required_tags" {
  description = "Required resource tags"
  type        = map(string)
}

variable "tags" {
  description = "Required resource tags"
  type        = map(string)
}

variable "tenant" {
  description = "Tag value for Tenant"
  type        = string
}

variable "cicd" {
  description = "Tag value for CICD deployment method"
  type        = string
}

variable "venue" {
  description = "Tag value for Venue"
  type        = string
}

variable "component" {
  description = "Tag value for applicaiton component"
  type        = string
}

variable "managedby" {
  description = "Tag value for owner managing the resource (E.g. for PDS Team we have PDS Team Email Distro)"
  type        = string
}

variable "s3_bucket_name" {
  description = "The name of the S3 bucket"
  type        = string
}
