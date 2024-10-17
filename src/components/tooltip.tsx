import { type JSX, Show, createEffect, createSignal, onMount } from "solid-js"

type Props = {
	children: JSX.Element
}

function Tooltip(props: Props) {
	const [isVisible, setIsVisible] = createSignal(false)

	createEffect(() => {
		if (!isVisible()) {
			return
		}
		const timer = setTimeout(() => {
			setIsVisible(false)
		}, 1000)

		return () => clearTimeout(timer)
	})

	onMount(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			console.log("keydown: ", e.key)
			if (e.key === "e") {
				navigator.clipboard.writeText("rr.ashurmatov.21@gmail.com")
				setIsVisible(true)
			}
		}

		document.addEventListener("keydown", handleKeyDown)

		return () => {
			document.removeEventListener("keydown", handleKeyDown)
		}
	})

	return (
		<div class="relative inline-block">
			<div
				tabIndex="0"
				class="cursor-pointer"
				role="button"
				onClick={() => {
					setIsVisible(true)
				}}>
				{props.children}
			</div>

			<Show when={isVisible()}>
				<div class="absolute left-1/2 z-10 mt-1 max-h-[70px] w-auto -translate-x-1/2 -translate-y-24 whitespace-normal rounded-lg border border-green-400 bg-black p-2 text-center text-white shadow-solid shadow-green-400 after:absolute after:-bottom-2 after:left-1/2 after:z-20 after:block after:size-4 after:-translate-x-1/2 after:rotate-45 after:bg-black after:shadow-solid after:shadow-green-400 after:content-['']">
					<p class="w-max">Copied to clipboard</p>
				</div>
			</Show>
		</div>
	)
}

export default Tooltip
