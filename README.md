# dclarkdev

Source for the dclarkdev.com static site, plus the Terraform that provisions its AWS hosting and the GitHub Actions workflow that deploys it.

## Site contents

A plain static site with no build step:

- `index.html`
- `script.js`
- `site.webmanifest`
- `styles/`
- `logos/`

## How the site is hosted

The site is served from a private S3 bucket through a CloudFront distribution.

- **S3:** All public access to the bucket is blocked. The bucket has no website configuration, because CloudFront reads from the S3 REST endpoint.
- **CloudFront:**
  - The distribution uses an Origin Access Control (SigV4, always signing) to read from the bucket.
  - The default root object is `index.html`.
  - Viewers are redirected from HTTP to HTTPS.
  - Only `GET` and `HEAD` are allowed.
  - It uses the managed `CachingOptimized` cache policy, `PriceClass_200`, and IPv6.
  - There are no geo restrictions.
- **Bucket policy:** The only grant is `s3:GetObject` to the CloudFront service principal. It is conditioned on the ARN of this one distribution.
- **Domain and TLS:**
  - The distribution answers for `dclarkdev.com` and `www.dclarkdev.com`.
  - An ACM certificate covers both names and is validated by DNS.
  - Route 53 `A` alias records point both names at the distribution.

## What `terraform/` manages

`main.tf` manages these resources:

- the S3 bucket and its public access block
- the bucket policy
- the ACM certificate, its DNS validation records in Route 53, and the certificate validation
- the CloudFront Origin Access Control and distribution
- the Route 53 alias records for the two hostnames

It reads two things without managing them:

- the existing Route 53 hosted zone for `dclarkdev.com`
- the managed CloudFront cache policy

Other files:

- `variables.tf` defines `bucket_name`, which is required and validated against S3 naming rules. It is not hard-coded. The workflow passes it in from a GitHub secret.
- `provider.tf` configures the AWS provider in `us-east-1`, the region CloudFront requires for ACM certificates.
- `NOTES.md` is a decisions log explaining why some earlier config was removed.

### Remote state

Terraform state is stored in a separate, pre-existing S3 bucket used for Terraform state (a different bucket from the site bucket).

- It is configured in the `backend "s3"` block in `provider.tf`.
- The state key is `dclarkdev-tfstate/terraform.tfstate`.
- State is encrypted.
- Locking uses S3's native lock file (`use_lockfile = true`), so there is no DynamoDB table.

## GitHub Actions deployment

The workflow is `.github/workflows/deploy.yml`, named "Create S3 Bucket".

**Trigger:** A push to `main`. It has no manual or pull-request trigger.

**AWS authentication (OIDC, no stored keys):**

- The workflow requests `id-token: write` and `contents: read`.
- `aws-actions/configure-aws-credentials` uses GitHub's OIDC token to assume an IAM role. That role is the one named in the `IAM_ROLE` repository secret.
- No AWS access keys are stored in GitHub, and the credentials are short-lived.
- The secrets hold configuration values only: `IAM_ROLE`, `AWS_REGION`, and `BUCKET_NAME`.

**Steps, in order:**

1. Check out the repo.
2. Assume the AWS role via OIDC.
3. Install Terraform.
4. `terraform init` in `terraform/`.
5. `terraform plan`, with `bucket_name` set from the secret.
6. `terraform apply -auto-approve`. This applies directly with no approval gate, and it does not apply the saved plan from step 5. The plan step is informational only.
7. Upload the site files to the bucket with `aws s3 cp`:
   - `index.html`
   - `script.js`
   - `site.webmanifest`
   - `styles/` (recursive)
   - `logos/` (recursive)

Things the workflow does not do:

- It does not delete files from the bucket that were removed from the repo, because it uses `cp` rather than `sync`.
- It does not invalidate the CloudFront cache. An invalidation step exists only as a commented-out block, so updated files can be served from cache until it expires.
- It has no check that the Terraform state key matches the repository name. State is simply read from the key in `provider.tf`.
