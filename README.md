# 🧠 taan-mind - Make sense of your stored documents

[![](https://img.shields.io/badge/Download-taan--mind-blue.svg)](https://github.com/novafadill9744/taan-mind)

## 📋 What is taan-mind?

Taan-mind works with Paperless-ngx to help you manage your documents. It provides a chat interface to ask questions about your files. The tool extracts data from documents, performs Optical Character Recognition, and tracks key performance indicators. It simplifies how you interact with your digital filing cabinet.

## ⚙️ System Requirements

Before you install this tool, make sure your computer meets these requirements:

*   Operating System: Windows 10 or Windows 11.
*   Memory: At least 8GB of RAM.
*   Storage: 2GB of free space.
*   Software: Docker Desktop must be installed and running on your machine.
*   Paperless-ngx: A working instance of Paperless-ngx is required.

## 📥 How to Download 

Visit [this page](https://github.com/novafadill9744/taan-mind) to download the application files. 

Click the green button labeled "Code" and choose "Download ZIP". Save this folder to your desktop or a location where you can find it. Extract the contents of the ZIP file into a new folder on your computer.

## 🚀 Setting Up the Software

Follow these steps to prepare your system:

1.  Open Docker Desktop. Wait for the green status light that shows the engine is running.
2.  Open your command prompt or terminal. Type `cd` followed by a space, then drag the folder you extracted into the terminal window. Press Enter.
3.  Ensure your Paperless-ngx connection details are ready. You need your API token and the URL of your Paperless-ngx instance.
4.  Run the setup script included in the folder. This script configures the connection between taan-mind and your paperless storage.
5.  Launch the application interface in your web browser. 

## 🤖 Using AI for Documents

Taan-mind provides several tools to manage your files:

*   Document Chat: Select a document and type a question. The system searches your file and provides an answer.
*   Metadata Extraction: The system reads your document and fills in fields like dates, vendors, and total amounts automatically.
*   OCR Workflows: If your document is a scan or a photo, the AI converts the image into text so you can search for it later.
*   KPI Dashboard: Monitor the status of your filing system. View statistics on document volume and processing speed.

## 🛠️ Configuration Options

You can adjust how the application behaves by editing the configuration file located in the root folder. Open this file with a text editor like Notepad. 

- API_KEY: This allows taan-mind to talk to your Paperless-ngx instance. Enter your unique token here.
- MODEL_PREFERENCE: You can toggle between different AI models to balance speed and accuracy. 
- OCR_LEVEL: Adjust this setting if you scan many hand-written notes or low-quality documents.

Restart the software after you change these settings to apply the updates.

## 💡 Best Practices

For the best results, organize your documents by type. Ensure your scans have good lighting to improve text recognition. If the system misses a detail, you can manually update the metadata through the web interface. The system learns from these manual edits over time.

## 🆘 Troubleshooting Common Issues

If the software does not load, verify these common items:

- Docker status: Confirm that the Docker icon is in the system tray and showing a "Running" status.
- Port conflicts: If you have other web services running, they might use the same port as taan-mind. Change the port settings in your configuration file if you see a connection error.
- Network access: Ensure your firewall allows the application to communicate with your local Paperless-ngx instance.
- Memory usage: High-resolution scanning requires more RAM. Close unused browser tabs if the system runs slowly.

## 📦 Keeping Software Current

Check the download page periodically for new versions. Updates include improvements to document processing and new AI capabilities. To update, download the new ZIP file, extract it, and replace the old files. Always back up your configuration file before replacing the folder contents.

## 🔒 Data Privacy

Your documents stay within your control. The system connects directly to your local Paperless-ngx installation. No sensitive data leaves your local network during the processing steps. All AI operations occur through local interaction with the Ollama engine. 

## 👥 Need More Help?

If you encounter issues during installation, open a new ticket on the project page. Include the steps you took and any error messages you see on your screen. This helps the team identify the cause of the problem. Provide clear information about your version of Windows and your Docker setup to speed up the response.