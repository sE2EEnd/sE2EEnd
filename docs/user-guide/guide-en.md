# What is sE2EEnd?

**sE2EEnd** is a secure file sharing platform for your organization. Files are **encrypted directly in your browser** before being uploaded — the server only ever stores ciphertext. Not even the administrator can read your data.

The encryption key is embedded in the share link itself and is never transmitted to the server.

---

# Sending a File

## Step 1 — Log in

Sign in with your organization account. Authentication is handled by your company's identity provider.

## Step 2 — Create a new send

Click **New Send** from the home page or the sidebar.

## Step 3 — Add your files

Drag and drop your files into the upload zone, or click to browse. Multiple files can be added to a single send.

## Step 4 — Configure options

| Option | Description |
|--------|-------------|
| Expiration date | The link will stop working after this date |
| Download limit | Maximum number of times the files can be downloaded |
| Password | Recipients must enter a password before accessing the files |

## Step 5 — Send and share

Click **Send**. Copy the generated link and share it with your recipient through a secure channel.

> **Important:** The link contains the decryption key. Anyone with the link can access the files. Do not share it over unsecured channels such as unencrypted email.

---

# Downloading a File

## Receiving a link

When someone shares a sE2EEnd link with you, open it in your browser.

- If the send is **password-protected**, you will be prompted to enter a password.
- Click **Download** next to each file, or use **Download all** if available.

Files are decrypted automatically in your browser. Nothing is stored on the server after decryption — the process is entirely local.

---

# Managing Your Sends

Access the **Dashboard** to monitor and manage your active transfers.

| Action | Description |
|--------|-------------|
| View status | See download counts and expiration dates at a glance |
| Revoke | Instantly invalidates the link — even if the recipient already has it |
| Delete | Permanently removes the send and its files from the server |

---

# Security Overview

| Property | Detail |
|----------|--------|
| Algorithm | AES-256-GCM (military-grade encryption) |
| Key location | URL fragment only — never sent to or stored by the server |
| Server storage | Ciphertext only — filenames and content are unreadable server-side |
| Revocation | Instant and permanent |
| Authentication | OAuth2 / OIDC via your organization's identity provider |

> If you lose the link, the files cannot be recovered. The encryption key lives only in the link itself.

---

# FAQ

**Can I send multiple files at once?**
Yes. All files in a send share the same link, expiration, and access settings.

**What happens when the download limit is reached?**
The link becomes inactive automatically and appears as expired in your dashboard.

**Can I extend an expiration date after creating a send?**
Not currently. Create a new send if you need a fresh link.

**Is there a file size limit?**
This depends on your organization's configuration. Contact your administrator if you encounter issues with large files.

**Who can see my files?**
Only recipients who have the link (and the password, if set). The server administrator cannot read your files.
