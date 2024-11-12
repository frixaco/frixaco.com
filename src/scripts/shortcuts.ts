import { navigate } from "astro:transitions/client"

if (window.location.pathname === "/") {
	const shortcutsHandler = (e: KeyboardEvent) => {
		if (document.getElementById("shortcuts-toggle-label")!.textContent === "enable") {
			return
		}

		if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
			return
		}

		if (e.key === "p") {
			navigate("/projects")
		}
		if (e.key === "b") {
			navigate("/blog")
		}

		if (e.key === "a") {
			navigate("/about")
		}
		if (e.key === "g") {
			window.open("https://github.com/frixaco", "_blank")
		}
		if (e.key === "l") {
			window.open("https://linkedin.com/in/frixaco", "_blank")
		}
		if (e.key === "x") {
			window.open("https://x.com/frixaco", "_blank")
		}
	}
	window.addEventListener("keydown", shortcutsHandler)

	const projectsDiv = document.getElementById("projects")
	const projectBlockHandler = () => {
		navigate("/projects")
	}

	const blogDiv = document.getElementById("blog")
	const blogBlockHandler = () => {
		navigate("/blog")
	}

	const aboutDiv = document.getElementById("about")
	const aboutBlockHandler = () => {
		navigate("/about")
	}

	projectsDiv?.addEventListener("click", projectBlockHandler)
	aboutDiv!.addEventListener("click", aboutBlockHandler)
	blogDiv!.addEventListener("click", blogBlockHandler)
}
