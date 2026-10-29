
console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/* ========================================
   Step 3: Automatic Navigation Menu
   ======================================== */

let pages = [
  { url: "index.html", title: "Home" },
  { url: "about.html", title: "About" },
  { url: "resume.html", title: "Resume" },
  { url: "projects.html", title: "Projects" },
  { url: "skills.html", title: "Skills" },
  { url: "contact.html", title: "Contact" },
  {
    url: "https://github.com/MaggieShao596",
    title: "GitHub",
  },
];

function normalize(path) {
  return path
    .replace(/index\.html$/, "")
    .replace(/\.html$/, "");
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

  if (
    a.host === location.host &&
    normalize(a.pathname) === normalize(location.pathname)
  ) {
    a.setAttribute("aria-current", "page");
  }

  if (a.host !== location.host) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
}

/* ========================================
   Step 4: Dark Mode Switcher
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
  </label>
  `
);

let select = document.querySelector(
  ".color-scheme select"
);

const OS_DARK = matchMedia(
  "(prefers-color-scheme: dark)"
);

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty(
    "color-scheme",
    colorScheme
  );

  document.documentElement.classList.toggle(
    "is-dark",
    colorScheme === "dark" ||
      (
        colorScheme === "light dark" &&
        OS_DARK.matches
      )
  );

  select.value = colorScheme;
}

setColorScheme(
  localStorage.colorScheme ?? "light dark"
);

OS_DARK.addEventListener("change", () => {
  setColorScheme(select.value);
});

select.addEventListener("input", function (event) {
  setColorScheme(event.target.value);

  localStorage.colorScheme = event.target.value;
});

/* ========================================
   Lab 4: Fetch JSON Data
   ======================================== */

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch data: ${response.status}`
      );
    }

    return await response.json();

  } catch (error) {
    console.error("Error fetching JSON:", error);

    return null;
  }
}

/* ========================================
   Lab 4 + Lab 5: Render Projects
   ======================================== */

export function renderProjects(
  projects,
  containerElement,
  headingLevel = "h2"
) {
  if (!containerElement) return;

  // Clear previous projects before rendering
  containerElement.innerHTML = "";

  if (
    !Array.isArray(projects) ||
    projects.length === 0
  ) {
    containerElement.textContent =
      "No projects available.";

    return;
  }

  const heading = /^h[1-6]$/.test(headingLevel)
    ? headingLevel
    : "h2";

  for (const project of projects) {

    // Create project article
    const article = document.createElement("article");

    article.className = "project-card";

    // Project title
    const title = document.createElement(heading);

    title.textContent =
      project.title || "Untitled Project";

    article.appendChild(title);

    // Project image
    if (project.image) {
      const img = document.createElement("img");

      img.src = project.image;
      img.alt = project.title || "Project image";
      img.loading = "lazy";

      article.appendChild(img);
    }

    // Container for description and year
    const details = document.createElement("div");

    details.className = "project-details";

    // Project description
    if (project.description) {
      const description = document.createElement("p");

      description.textContent = project.description;

      details.appendChild(description);
    }

    // Lab 5 Step 0: Display project year
    if (project.year !== undefined &&
        project.year !== null) {

      const year = document.createElement("p");

      year.className = "project-year";

      year.textContent = project.year;

      details.appendChild(year);
    }

    article.appendChild(details);

    // Project link
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

/* ========================================
   Lab 4: GitHub API
   ======================================== */

export async function fetchGitHubData(username) {
  return fetchJSON(
    `https://api.github.com/users/${username}`
  );
}
