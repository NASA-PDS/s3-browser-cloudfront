module "s3_bucket" {
  source        = "git@github.com:NASA-PDS/pds-tf-modules.git//terraform/modules/s3/bucket"
  bucket_name   = var.s3_bucket_name
  partition     = var.partition
  bucket_policy = <<POLICY
  {
     "Version": "2012-10-17",
     "Statement": [
         {
             "Sid": "AllowOnlyMCPTenantOperator",
             "Effect": "Allow",
             "Principal": {
               "AWS": [
                 "arn:${var.partition}:iam::${data.aws_caller_identity.current.account_id}:role/mcp-tenantOperator"
               ]
             },
             "Action": "s3:*",
             "Resource": [
                 "arn:${var.partition}:s3:::${var.s3_bucket_name}/*",
                 "arn:${var.partition}:s3:::${var.s3_bucket_name}"
             ]
         },
         {
             "Sid": "AllowSSLRequestsOnly",
             "Effect": "Deny",
             "Principal": "*",
             "Action": "s3:*",
             "Resource": [
                "arn:${var.partition}:s3:::${var.s3_bucket_name}",
                "arn:${var.partition}:s3:::${var.s3_bucket_name}/*"
              ],
              "Condition": {
                "Bool": {
                   "aws:SecureTransport": "false"
                 }
             }
         }
     ]
  }
  POLICY
  enable_blocks = false
  enable_policy = true

  required_tags = {
    tenant    = var.tenant
    venue     = var.venue
    component = var.component
    cicd      = var.cicd
    managedby = var.managedby
  }
}

resource "aws_ssm_parameter" "s3_bucket_name" {
  name      = "/pds/s3-browser/s3-bucket"
  type      = "String"
  value     = module.s3_bucket.bucket_name
  overwrite = true
}