# GitHub Pages Deployment

This project includes a GitHub Action that automatically deploys the UI to GitHub Pages for showcasing purposes.

## 🚀 How to Enable GitHub Pages

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under "Build and deployment", set:
     - **Source**: GitHub Actions
   
2. **Trigger the deployment:**
   - The workflow automatically runs on pushes to `main` or `docs-additions` branches
   - Or manually trigger it from the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

3. **Access your deployment:**
   - Once deployed, your site will be available at: `https://<username>.github.io/<repository-name>/`
   - For this repo: `https://mso-docs.github.io/Docs-Navigator-MCP-SUSE-Edition/`

## 📋 What Gets Deployed

The GitHub Pages deployment includes:
- ✅ Full UI with modern design
- ✅ Source cards showcase
- ✅ Static demo data showing all documentation sources
- ⚠️ **Demo Mode**: Search and AI features show informational messages (backend required for full functionality)

## 🎨 Demo Mode Features

The GitHub Pages version runs in **demo mode** because it's a static site:
- Shows the complete UI design
- Displays all documentation sources
- Interactive tabs and navigation work fully
- Search/Ask/Summarize features display informational messages explaining that the backend is needed

To use the **full application** with AI-powered search:
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure your AI provider (Ollama or OpenAI)
4. Run locally: `npm run web`

## 🔧 Workflow Configuration

The deployment workflow (`.github/workflows/deploy-pages.yml`) does the following:
1. Checks out the code
2. Sets up Node.js environment
3. Installs dependencies
4. Copies public files to deployment directory
5. Creates mock API responses for demo mode
6. Injects demo mode JavaScript
7. Deploys to GitHub Pages

## 🛠️ Manual Deployment

To manually trigger a deployment:
1. Go to the **Actions** tab in your GitHub repository
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**
4. Select the branch (usually `main` or `docs-additions`)
5. Click **Run workflow**

The deployment typically takes 1-2 minutes to complete.

## 📝 Customization

To customize the demo mode banner or behavior, edit the `demo-notice.js` content in the workflow file (`.github/workflows/deploy-pages.yml`).

## 🔒 Required Permissions

The workflow requires these permissions (already configured):
- `contents: read` - Read repository content
- `pages: write` - Deploy to GitHub Pages
- `id-token: write` - Required for GitHub Pages deployment
