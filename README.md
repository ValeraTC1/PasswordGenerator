# PasswordGenerator
PasswordGenerator is an Obsidian plugin that creates passwords. It works on PCs and phones the need to store passwords by regenerating them using memorable keys.
**Getting Started and Security Importance**

Before using it, it is **crucially important** to change the default settings to ensure maximum protection.

1.  **Step 1: Security Configuration**
    *   Open the plugin settings.
    *   **Salt:** Delete the default value. Leave the field empty. **Recommendation:** Your personal salt should be kept only in your memory and entered manually each time you generate a password. This prevents the salt from being stored in the Obsidian configuration file. Thus, even if someone gains access to your vault, your passwords will remain inaccessible.
    *   **Iteration Count:** Change the default value to your own.

#### **Password Generation Process**

2.  **Step 2: Opening the Interface**
    *   Click on the lock icon in the Obsidian panel. The plugin's side panel will open on the right.
3.  **Step 3: Filling in the Parameters**
    *   **Base Word:** Enter a unique identifier (e.g., a website or service name: `github.com`).
    *   **Your Salt:** Enter your memorized secret phrase (e.g., mySecretKey).
    *   **Password Length:** Choose a value from 8 to 32 characters.
    *   **Iterations:** Specify the number of iterations (you can leave the value you changed earlier).
4.  **Step 4: Generation**
    *   Click the **"Generate Password"** button. The password will be automatically copied to your clipboard and is ready to use.

#### **Changing a Password**

To change a password for any service, simply **adjust any of the parameters**: change the salt, the number of iterations, or even the format of the base word. The plugin will instantly generate a completely new password.
