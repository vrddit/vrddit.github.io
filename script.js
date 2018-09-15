let setCustomPlayerEvents = function() {
	let videoPlayer = document.querySelector("#video-player");
	let audioPlayer = document.querySelector("#audio-player");

	videojs('video-player', {}, function() {
		this.volume(1);
		audioPlayer.volume = 1;
	});

	let changeAudioTime = true;

	let pauseAudio = function() {
		audioPlayer.pause();
		changeAudioTime = true;
	};

	let resumeAudio = function() {
		audioPlayer.play();
		if (changeAudioTime) {
			audioPlayer.currentTime = videoPlayer.currentTime;
			changeAudioTime = false;
		}
	};

	videoPlayer.onpause = function() {
		pauseAudio();
	};

	videoPlayer.onplay = function() {
		resumeAudio();
	};

	videoPlayer.onwaiting = function() {
		pauseAudio();
	};

	videoPlayer.onplaying = function() {
		resumeAudio();
	};

	videoPlayer.onvolumechange = function() {
		audioPlayer.volume = videoPlayer.volume;
		if (videoPlayer.muted) {
			audioPlayer.volume = 0;
		}
	};

	videoPlayer.ontimeupdate = function() {
		if (Math.abs(videoPlayer.currentTime - audioPlayer.currentTime) > 0.25) {
			audioPlayer.currentTime = videoPlayer.currentTime;
		}
	};
};

let loadPlayer = function(type, urlVideo) {
	let playerTemplate;
	let mainContent = document.querySelector(".main-content");
	if (type === "custom") {
		playerTemplate = document.querySelector("#template-custom");
		mainContent.append(document.importNode(playerTemplate.content, true))
		setCustomPlayerEvents();
	} else {
		playerTemplate = document.querySelector("#template-embedded");
		mainContent.append(document.importNode(playerTemplate.content, true))
	}
	let videoContainer = document.querySelector(".video-container");
	let loader = document.querySelector(".loader");
	let request = new XMLHttpRequest();
	urlVideo = checkAndFixUrl(urlVideo);
	request.open("GET", urlVideo + "/.json", true);
	request.onload = function() {
		loader.style.display = "none";
		videoContainer.style.display = "block";
		let data;
		try {
			data = JSON.parse(request.responseText);
		} catch (error) {
			trackJs.track(error);
			videoContainer.innerHTML = "<h1>Error</h1><h2>Video request failed</h2>";
			return;
		}
		if (request.status >= 200 && request.status < 400) {
			try {
				let postData = data[0].data.children[0].data;
				if (postData.crosspost_parent_list) {
					loadPlayer(type, postData.crosspost_parent_list[0].permalink);
				} else {
					document.title = postData.title;
					let redditVideoData = postData.media.reddit_video;
					let idPost = postData.id;
					if (redditVideoData) {
						if (type === "custom") {
							loadVideoUrl(redditVideoData);
						} else {
							loadVideoFrame(idPost);
						}
					}
				}
			} catch (error) {
				console.log(error);
				trackJs.track(error);
				videoContainer.innerHTML = "<h1>Error</h1><h2>URL doesn\'t have a v.redd.it video</h2>";
			}
		} else {
			trackJs.track(data);
			videoContainer.innerHTML = "<h1>" + data.error + "</h1><h2>" + data.message + "</h2>";
		}
	};
	request.onerror = function() {
		loader.style.display = "none";
		videoContainer.style.display = "block";
		let errorMessage = "Video request failed";
		let isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
		if (isFirefox) {
			errorMessage += " (Possibly blocked by Firefox's Tracking Protection)"
		}
		videoContainer.innerHTML = "<h1>Error</h1><h2>" + errorMessage + "</h2>";
	};
	request.send();
};

let checkAndFixUrl = function(url) {
	let posReddit = url.indexOf("r/");
	if (posReddit !== -1) {
		let urlPath = url.substring(posReddit, url.length);
		return "https://www.reddit.com/" + urlPath;
	}
};

let loadVideoUrl = function(redditVideoData) {
	videoUrl = redditVideoData.fallback_url;
	audioUrl = videoUrl.substring(0, videoUrl.lastIndexOf('/') + 1) + "audio";
	videojs('video-player').src({
		type : 'video/mp4',
		src : videoUrl
	});
	document.querySelector("#audio-source").setAttribute("src", audioUrl);
	let audioPlayer = document.querySelector("#audio-player");
	audioPlayer.load();
};

let getEmbededUrl = function(idPost) {
	return "https://www.reddit.com/mediaembed/" + idPost;
};

let loadVideoFrame = function(idPost) {
	urlVideo = getEmbededUrl(idPost);
	document.querySelector(".video-wrapper").innerHTML = '<iframe allowfullscreen="" scrolling="no" src="' + urlVideo + '" frameborder="0" onload="checkFrame()"></iframe>';
};

let checkFrame = function() {
	let iframeAltTextNode = document.createElement("h3");
	iframeAltTextNode.className = "iframe-alt-text";
	iframeAltTextNode.innerHTML = "If you can read this, the embedded player could not be loaded";
	document.querySelector(".video-wrapper").append(iframeAltTextNode);
};

let changeToggle = function(embeddedSelected) {
	let toggleContainer = document.getElementById('toggle-container-2');
	if (embeddedSelected) {
		toggleContainer.style.clipPath = 'inset(0 0 0 50%)';
		toggleContainer.style.backgroundColor = '#FF5700';
	} else {
		toggleContainer.style.clipPath = 'inset(0 50% 0 0)';
		toggleContainer.style.backgroundColor = '#3BCB56';
	}
};

let setToggleEvents = function() {
	let toggle = document.getElementById('toggle-container');
	let embeddedSelected = false;

	let currentUrl = window.location.href;
	embeddedSelected = currentUrl.includes("?e=");

	changeToggle(embeddedSelected);

	toggle.addEventListener('click', function() {
		embeddedSelected = !embeddedSelected;
		changeToggle(embeddedSelected);
		let label = document.querySelector("#form-label");
		let input = document.querySelector("#form-input");
		if (label && input) {
			if (embeddedSelected) {
				label.setAttribute("for", "e");
				input.setAttribute("name", "e");
			} else {
				label.setAttribute("for", "v");
				input.setAttribute("name", "v");
			}
		} else {
			let currentUrl = window.location.href;
			if (embeddedSelected && currentUrl.includes("?v=")) {
				window.location.href = currentUrl.replace("?v=", "?e=");
			} else if (!embeddedSelected && currentUrl.includes("?e=")) {
				window.location.href = currentUrl.replace("?e=", "?v=");
			}
		}
	});
};

let loadCSS = function(cssPath) {
	let linkTag = document.createElement("link");
	linkTag.href = cssPath;
	linkTag.type = "text/css";
	linkTag.rel = "stylesheet";
	document.querySelector("head").append(linkTag);
}

window.onload = function() {
	let searchParams = new URLSearchParams(window.location.search);
	setToggleEvents();

	if (searchParams.has("v") && searchParams.get("v")) {
		loadCSS("custom-player.css")
		loadPlayer("custom", searchParams.get("v"));
	} else if (searchParams.has("e") && searchParams.get("e")) {
		loadCSS("embedded-player.css")
		loadPlayer("embedded", searchParams.get("e"));
	} else {
		let mainContent = document.querySelector(".main-content");
		let loader = document.querySelector(".loader");
		loader.style.display = "none";
		mainContent.style.display = "flex";
		mainContent.innerHTML = "<form><label id='form-label' for='v'>URL to Reddit Post</label><input id='form-input' name='v'><button type='submit'>Send</button></form>";
	}
};