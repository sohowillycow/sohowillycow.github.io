# White Hat Hacker - Personal Website

This repository contains the source code for a bilingual (English and Traditional Chinese) personal website designed for a white-hat hacker. The website features a unique blend of hacker, cosmos, and futuristic themes. It's built with plain HTML, CSS, and JavaScript, optimized for easy understanding and deployment on GitHub Pages.

## Features

*   **Bilingual Content:** Full English and Traditional Chinese versions for all pages.
*   **Responsive Design:** Adapts to various screen sizes, from mobile to desktop.
*   **Thematic Styling:**
    *   Hacker vibe: Mysterious, technical, with glitch text effects.
    *   Cosmos visuals: Animated starfield background (using tsparticles.js) and space-themed imagery (placeholder for Messier 64).
    *   Futuristic UI: Clean techno elements, neon accents, and glassmorphic panels.
*   **Interactive Elements:**
    *   Language toggle with `localStorage` persistence.
    *   Hover effects and reveal-on-scroll animations.
    *   Console easter egg.
    *   Syntax highlighting for code snippets on project pages (using Prism.js).
*   **No Build Tools:** Plain HTML, CSS, and JavaScript for simplicity and easy "View Source" inspection.
*   **GitHub Pages Ready:** Designed for straightforward deployment.

## File Structure

```
/
├── index.html               # English homepage
├── index-zh.html            # Chinese homepage
├── about.html               # English about page
├── about-zh.html            # Chinese about page
├── projects.html            # English projects page
├── projects-zh.html         # Chinese projects page
├── contact.html             # English contact page
├── contact-zh.html          # Chinese contact page
├── css/
│   └── main.css             # Main stylesheet
├── js/
│   └── main.js              # Main JavaScript file
├── assets/
│   ├── images/              # For background images, profile pictures, project thumbnails
│   │   ├── messier64_bg.jpg (Placeholder - Add your own)
│   │   ├── profile_placeholder.png (Placeholder)
│   │   └── project_placeholder_*.png (Placeholders)
│   ├── icons/               # For favicons, social media icons (SVG preferred)
│   │   ├── favicon.ico (Placeholder)
│   │   └── apple-touch-icon.png (Placeholder)
│   └── fonts/               # For local font files (e.g., ZCOOL Kugaosong Hei)
├── README.md                # This file
└── PROJECT_PLAN.md          # Detailed project plan (generated during development)
```

## Prerequisites

1.  **Git:** You'll need Git installed on your computer to clone the repository. You can download it from [git-scm.com](https://git-scm.com/).
2.  **GitHub Account:** You'll need a GitHub account to host the website on GitHub Pages.

## Getting Started & Deployment to GitHub Pages

Follow these steps to get a copy of the website running and deploy it to your own GitHub Pages.

### 1. Clone the Repository

Open your terminal or command prompt and run the following command, replacing `your-username` with your GitHub username and `your-repository-name` with the name you want for your repository:

```bash
git clone https://github.com/your-username/your-repository-name.git
cd your-repository-name
```

Alternatively, if you've forked this repository, clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/REPOSITORY_NAME.git
cd REPOSITORY_NAME
```

### 2. Customize Content & Assets

*   **Text Content:** Edit the HTML files (`.html`) to personalize the text content (your name, bio, project details, contact information, GPG key ID, social media links, etc.).
*   **Images:**
    *   Replace placeholder images in the `/assets/images/` directory with your own.
        *   `messier64_bg.jpg`: A high-quality image for the starfield background.
        *   `profile_placeholder.png`: Your profile picture or a suitable avatar.
        *   `project_placeholder_*.png`: Thumbnails for your projects.
    *   Update image paths in the HTML and CSS files if you change filenames or locations.
*   **Icons:**
    *   Replace `favicon.ico` and `apple-touch-icon.png` in `/assets/icons/` with your own website icons.
*   **Fonts:**
    *   The site uses Google Fonts (Orbitron, Roboto, Noto Sans TC).
    *   For the Chinese heading font "站酷高端黑" (ZCOOL KuHei), you can:
        *   Download it from a reputable source (ensure licensing allows web use).
        *   Place the font files (e.g., `.ttf`, `.woff2`) in the `/assets/fonts/` directory.
        *   Update the `@font-face` rule in `css/main.css` if necessary (a basic fallback system is already in place).
*   **Contact Email:** Update the `mailto:` link in `contact.html` and `contact-zh.html` to your email address.

### 3. Test Locally

Open the `index.html` or `index-zh.html` file in your web browser to preview the website locally.

### 4. Commit and Push Your Changes

Once you've customized the site, commit your changes:

```bash
git add .
git commit -m "Personalized website content and assets"
git push origin main  # Or your default branch name
```

### 5. Enable GitHub Pages

1.  Go to your repository on GitHub.com.
2.  Click on the **Settings** tab.
3.  In the left sidebar, click on **Pages**.
4.  Under "Build and deployment", for the **Source**, select **Deploy from a branch**.
5.  Under "Branch", select `main` (or your default branch) and `/ (root)` folder.
6.  Click **Save**.

GitHub Pages will then build and deploy your site. It might take a few minutes. Your site will be available at `https://your-username.github.io/your-repository-name/`.

### 6. Custom Domain (Optional)

If you have a custom domain, you can configure it in the GitHub Pages settings. Follow GitHub's official documentation for [configuring a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site). GitHub Pages also provides free HTTPS for custom domains.

## Updating the Website

To update your website:

1.  Make changes to the files locally.
2.  Test your changes.
3.  Commit and push the changes to your GitHub repository:
    ```bash
    git add .
    git commit -m "Updated website content" # Or a more specific message
    git push origin main
    ```
GitHub Pages will automatically redeploy your site with the new changes.

## Analytics and Privacy Banners (Optional)

*   **Analytics:** If you want to add web analytics (e.g., Google Analytics, Plausible), you'll typically need to embed a JavaScript snippet into your HTML files, usually before the closing `</body>` tag.
*   **Privacy/Cookie Banners:** If your analytics or other third-party scripts require user consent (e.g., under GDPR), you might need to add a cookie consent banner. There are many open-source JavaScript libraries available for this.

Remember to comply with all relevant privacy regulations.

## Contributing

While this is a personal website template, if you find bugs or have suggestions for improving the template itself, feel free to open an issue or submit a pull request to the original repository if you forked from one.

## License

The code in this repository is provided under the [MIT License](LICENSE) (you would need to add a LICENSE file for this).
The design concept and structure are for personal use.
Ensure that any assets (images, fonts) you use have appropriate licenses for web deployment.
