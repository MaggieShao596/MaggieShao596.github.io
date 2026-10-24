console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/* ========================================
   Step 3: automatic navigation menu
   ======================================== */

let pages = [
  { url: "index.html", title: "Home" },
  { url: "about.html", title: "About" },
  { url: "resume.html", title: "Resume" },
  { url: "projects.html", title: "Projects" },
  { url: "skills.html", title: "Skills" },
  { url: "contact.html", title: "Contact" },
  { url: "https://github.com/MaggieShao596", title: "GitHub" },
];

// "/" and "/index.html" are the same page; "/about" and "/about.html" too
// (GitHub Pages serves both forms)
function normalize(path) {
  return path.replace(/index\.html$/, "").replace(/\.html$/, "");
}

let nav = document.createElement("nav");
nav.classList.add("nav");
nav.setAttribute("aria-label", "Main navigation");
document.body.prepend(nav);

for (let p of pages) {
  let a = document.createElement("a");
  a.href = p.url;
  a.textContent = p.title;
  nav.append(a);

  // Highlight the link to the current page
  if (
    a.host === location.host &&
    normalize(a.pathname) === normalize(location.pathname)
  ) {
    a.setAttribute("aria-current", "page");
  }

  // Open external links (GitHub) in a new tab
  if (a.host !== location.host) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
}

/* ========================================
   Step 4: dark mode switcher
   ======================================== */

document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);

let select = document.querySelector(".color-scheme select");
const OS_DARK = matchMedia("(prefers-color-scheme: dark)");

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty("color-scheme", colorScheme);

  // The .is-dark class lets CSS fix things that media queries can't
  // (e.g. inverting the black social icons) when the theme is chosen manually
  document.documentElement.classList.toggle(
    "is-dark",
    colorScheme === "dark" ||
      (colorScheme === "light dark" && OS_DARK.matches)
  );

  select.value = colorScheme;
}

// Restore the saved preference (default: automatic)
setColorScheme(localStorage.colorScheme ?? "light dark");

// If the OS theme changes while on "Automatic", update again
OS_DARK.addEventListener("change", () => setColorScheme(select.value));

select.addEventListener("input", function (event) {
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});

// Lab 4: Fetch JSON data
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching JSON:", error);
    return null;
  }
}

// Lab 4: Dynamically render projects
export function renderProjects(projects, containerElement, headingLevel = "h2") {
  if (!containerElement) return;

  containerElement.innerHTML = "";

  if (!Array.isArray(projects) || projects.length === 0) {
    containerElement.textContent = "No projects available.";
    return;
  }

  const heading = /^h[1-6]$/.test(headingLevel) ? headingLevel : "h2";

  for (const project of projects) {
    const article = document.createElement("article");
    article.className = "project-card";

    const title = document.createElement(heading);
    title.textContent = project.title || "Untitled Project";
    article.appendChild(title);

    if (project.image) {
      const img = document.createElement("img");
      img.src = project.image;
      img.alt = project.title || "Project image";
      img.loading = "lazy";
      article.appendChild(img);
    }

    if (project.description) {
      const description = document.createElement("p");
      description.textContent = project.description;
      article.appendChild(description);
    }

    if (project.year) {
      const year = document.createElement("p");
      year.textContent = `Year: ${project.year}`;
      article.appendChild(year);
    }

    if (project.link) {
      const link = document.createElement("a");
      link.href = project.link;
      link.textContent = "View on GitHub →";
      link.className = "project-link";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      article.appendChild(link);
    }

    containerElement.appendChild(article);
  }
}
