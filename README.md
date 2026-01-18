# Secure File Processing Pipeline

## Overview

The Secure File Processing Pipeline is a serverless application that provides a robust and secure way to upload, process, download, and manage files using AWS services. This application automatically optimizes images and PDFs through intelligent compression while maintaining security throughout the entire workflow.

## Features

- **Secure File Upload**: Users can upload files securely to an S3 bucket using pre-signed URLs.
- **Automatic File Processing**: Uploaded files are automatically processed and optimized:
  - **Images**: Optimized using Sharp with WebP conversion, resized to max 1200px width
  - **PDFs**: Compressed using PDFDocument with object streams enabled
- **File Download**: Users can download processed files from the S3 bucket using secure pre-signed URLs.
- **File Metadata Retrieval**: Users can retrieve detailed metadata including compression ratios and processing status.
- **Serverless Architecture**: Built with AWS Lambda and the Serverless Framework for automatic scaling and reduced operational costs.

## Architecture

The application is built as a fully serverless solution using the Serverless Framework for infrastructure-as-code deployment. The main components include:

- **Serverless Framework**: Infrastructure-as-code for deployment and management
- **AWS Lambda**: Event-driven functions that handle file uploads, processing, downloads, and metadata retrieval
- **API Gateway**: RESTful API endpoints for client interactions
- **S3**: Object storage for original and processed files (organized in `/uploads/original` and `/uploads/processed` folders)
- **DynamoDB**: Stores file metadata including processing status, compression ratios, and timestamps
- **S3 Events**: Triggers automatic processing pipeline when files are uploaded

## Endpoints

The following API endpoints are available:

- **POST** `/upload-url`: Generates a pre-signed URL for uploading files to S3.
- **GET** `/download`: Provides a pre-signed URL for downloading processed files.
- **GET** `/file-metadata`: Retrieves detailed metadata for uploaded files including processing status and compression stats.

## Processing Pipeline

When a file is uploaded:

1. User requests a pre-signed upload URL via POST `/upload-url`
2. File is uploaded directly to S3 at `uploads/original/{fileId}/{filename}`
3. S3 event triggers the `processUploadedFile` Lambda function
4. File is processed based on type:
   - **Images**: Converted to WebP format, resized to max 1200px, saved to `uploads/processed/images/`
   - **PDFs**: Compressed with object streams enabled, saved to `uploads/processed/pdfs/`
5. Metadata is updated in DynamoDB with compression statistics and status (`COMPLETED` or `FAILED`)
6. Users can download the processed file using a pre-signed URL from the `/download` endpoint

## Environment Variables

The application requires several environment variables to be set in the `.env` file:

```dotenv
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_DEFAULT_REGION=your_aws_region

endpoints:
  POST - https://ex5z9fh7ug.execute-api.eu-central-1.amazonaws.com/dev/upload-url
  GET - https://ex5z9fh7ug.execute-api.eu-central-1.amazonaws.com/dev/download
  GET - https://ex5z9fh7ug.execute-api.eu-central-1.amazonaws.com/dev/file-metadata
```

## Frontend

A companion frontend application provides a user interface for interacting with this API:

- **Frontend Repository**: [Secure File Processing UI](https://github.com/Davies70/secure-file-processing-ui) _(placeholder)_

The frontend handles:

- File selection and upload initiation
- Processing status monitoring
- Download of processed files
- File metadata and compression statistics display

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Davies70/secure-file-upload.git
   cd secure-file-upload
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your AWS credentials in the `.env` file.

## Usage

To deploy the application to AWS using the Serverless Framework:

```bash
serverless deploy
```

To deploy to a specific stage:

```bash
serverless deploy --stage production
```

To remove the deployment:

```bash
serverless remove
```

## Testing

To run tests, use the following command:

```bash
npm test
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- AWS for providing the cloud infrastructure.
- The Serverless framework for simplifying deployment.

---
