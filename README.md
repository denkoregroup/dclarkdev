# dclarkdev

Personal site of David Clark, live at https://dclarkdev.com. A static site in plain HTML, CSS and JavaScript with no build step, hosted on AWS and deployed from GitHub Actions.

## Run locally

There is nothing to install and no environment setup. Asset paths such as `/logos/...` are root-relative, so serve the folder rather than opening `index.html` directly:

```sh
npx http-server -p 8080 .
```

Then open http://localhost:8080. The contact form posts to Web3Forms, and fonts and icons load from CDNs, so the page needs network access to look right.

## Layout

- `index.html`, `script.js`, `site.webmanifest`: the page, its behavior and its manifest
- `styles/`: all CSS
- `logos/`: logo and favicon SVGs
- `terraform/`: AWS infrastructure
- `.github/workflows/deploy.yml`: deploy workflow

## Infrastructure

`terraform/` manages these resources:

- **S3:** a private bucket holding the site files, with all public access blocked.
- **CloudFront:** the distribution that serves the site over HTTPS, reading the bucket through Origin Access Control.
- **ACM:** the certificate for `dclarkdev.com` and `www.dclarkdev.com`, validated by DNS.
- **Route 53:** the validation records and the alias records for both hostnames, in an existing hosted zone.
- **Remote state:** kept in a separate S3 bucket with encryption and native locking; see `terraform/provider.tf`.

The bucket name is passed in as the `bucket_name` variable. `terraform/NOTES.md` records why some earlier config was removed.

## Deploy

A push to `main` runs `.github/workflows/deploy.yml`, which assumes an AWS role through GitHub OIDC (no stored keys), applies the Terraform and uploads the site files to S3. The repository secrets `IAM_ROLE`, `AWS_REGION` and `BUCKET_NAME` configure it.
