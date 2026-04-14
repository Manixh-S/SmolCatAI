import { useRef, useState } from "react";
import "./BackgroundMusic.css";

type BackgroundMusicProps = {
	src: string;
	title: string;
	creator: string;
};

function BackgroundMusic({ src, title, creator }: BackgroundMusicProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	const handleToggle = async () => {
		const audio = audioRef.current;
		if (!audio) {
			return;
		}

		if (isPlaying) {
			audio.pause();
			setIsPlaying(false);
			return;
		}

		try {
			await audio.play();
			setIsPlaying(true);
		} catch {
			setIsPlaying(false);
		}
	};

	return (
		<div className="background-music">
			<div className="background-music__meta" aria-live="polite">
				<div className="background-music__title">{title}</div>
				<div className="background-music__creator">by {creator}</div>
			</div>
			<button
				className={`background-music__toggle ${
					isPlaying
						? "background-music__toggle--playing"
						: "background-music__toggle--muted"
				}`}
				type="button"
				onClick={handleToggle}
				aria-label={isPlaying ? "Mute background music" : "Play background music"}
			>
				<span aria-hidden="true">{isPlaying ? "🔊" : "🔇"}</span>
			</button>
			<audio ref={audioRef} src={src} loop />
		</div>
	);
}

export default BackgroundMusic;
