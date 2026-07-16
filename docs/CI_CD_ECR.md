# CI/CD to Amazon ECR

This repo builds a production Docker image for the Vite app plus its `/api/data` and `/api/webhook` handlers, then pushes it to:

```text
770014814665.dkr.ecr.ap-south-1.amazonaws.com/akash_ipmt:latest
```

## GitHub Actions secrets

Preferred setup is GitHub OIDC with one secret:

```text
AWS_ROLE_TO_ASSUME=arn:aws:iam::770014814665:role/<github-actions-ecr-push-role>
```

The role needs permission to push only to the `akash_ipmt` ECR repository:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "arn:aws:ecr:ap-south-1:770014814665:repository/akash_ipmt"
    }
  ]
}
```

If OIDC is not ready yet, the workflow can also use these GitHub secrets:

```text
AWS_ACCESS_KEY_ID=<access key with ECR push permission>
AWS_SECRET_ACCESS_KEY=<secret access key>
```

## Local build and push

```bash
npm ci
npm run build
npm run build:server
docker build -t 770014814665.dkr.ecr.ap-south-1.amazonaws.com/akash_ipmt:latest .
aws ecr get-login-password --region ap-south-1 \
  | docker login --username AWS --password-stdin 770014814665.dkr.ecr.ap-south-1.amazonaws.com
docker push 770014814665.dkr.ecr.ap-south-1.amazonaws.com/akash_ipmt:latest
```

Or run:

```bash
./scripts/build-and-push-ecr.sh
```

The container listens on port `3000` and exposes `/healthz`.

Set `MONGODB_URI` in the runtime environment for `/api/data` and `/api/webhook`.
