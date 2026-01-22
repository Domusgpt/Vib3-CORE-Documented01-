# Project setup (GCP + Firebase)

This document provides a professional, repeatable setup flow for creating and configuring a new
Google Cloud + Firebase project for this repo. Follow these steps once per project.

## Prerequisites
- Google Cloud SDK (`gcloud`)
- Firebase CLI (`firebase`)
- GitHub CLI (`gh`) if you plan to wire CI secrets
- Access to a GCP billing account

See `DOCS/ENV_SETUP.md` if you need to install tooling first.

## 1) Authenticate and select project
```bash
gcloud auth login --no-launch-browser
gcloud auth application-default login --no-launch-browser
gcloud config set project gen-lang-client-0544919502
```

## 2) Enable required APIs
```bash
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  firebase.googleapis.com \
  firestore.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

## 3) Initialize Firebase
```bash
firebase login --no-localhost
firebase use --add
```

## 4) Optional: Firebase Test Lab (device testing)
```bash
gcloud services enable testing.googleapis.com
```

## 5) Optional: CI service account
Create a service account for CI workflows that need deploy/test access:
```bash
gcloud iam service-accounts create vib3-ci \
  --description="CI service account for Vib3 project automation" \
  --display-name="vib3-ci"

gcloud projects add-iam-policy-binding gen-lang-client-0544919502 \
  --member="serviceAccount:vib3-ci@gen-lang-client-0544919502.iam.gserviceaccount.com" \
  --role="roles/editor"
```

Export a key (store securely in your CI secrets manager):
```bash
gcloud iam service-accounts keys create vib3-ci-key.json \
  --iam-account="vib3-ci@gen-lang-client-0544919502.iam.gserviceaccount.com"
```

## 6) Next steps
- If you are using Firebase Functions, initialize `firebase init functions`.
- If you are using Firestore, initialize `firebase init firestore`.
- For CI automation, add the JSON key to your secret store and configure
  `GOOGLE_APPLICATION_CREDENTIALS`.
