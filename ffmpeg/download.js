let checkAndFixUrl = function(url) {
	let posReddit = url.indexOf("r/");
	if (posReddit !== -1) {
		let urlPath = url.substring(posReddit, url.length);
		return "https://www.reddit.com/" + urlPath;
	}
};

let requestPostData = function(urlVideo) {
	let videoContainer = document.querySelector(".video-container");
	let request = new XMLHttpRequest();
	urlVideo = checkAndFixUrl(urlVideo);
  console.log("URL VIDEO: " + urlVideo);
	request.open("GET", urlVideo + "/.json", true);
	request.onload = function() {
		let data;
		try {
			data = JSON.parse(request.responseText);
		} catch (error) {
			videoContainer.innerHTML = "<h1>Error</h1><h2>Video request failed</h2>";
			return;
		}
		if (request.status >= 200 && request.status < 400) {
			try {
				let postData = data[0].data.children[0].data;
				if (postData.crosspost_parent_list) {
					requestPostData(postData.crosspost_parent_list[0].permalink);
				} else {
					//document.title = postData.title;
					let redditVideoData = postData.media.reddit_video;
					let idPost = postData.id;
					if (redditVideoData) {
						getMedia(redditVideoData);
					}
				}
			} catch (error) {
				console.log(error);
				videoContainer.innerHTML = "<h1>Error</h1><h2>URL doesn\'t have a v.redd.it video</h2>";
			}
		} else {
			videoContainer.innerHTML = "<h1>" + data.error + "</h1><h2>" + data.message + "</h2>";
		}
	};
	request.onerror = function() {
		let errorMessage = "Video request failed";
		let isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
		if (isFirefox) {
			errorMessage += " (Possibly blocked by Firefox's Tracking Protection)"
		}
		videoContainer.innerHTML = "<h1>Error</h1><h2>" + errorMessage + "</h2>";
	};
	request.send();
};

let getMedia = function(redditVideoData) {
	let videoUrl = redditVideoData.fallback_url;
  console.log("VIDEO: " + videoUrl);
	let audioUrl = videoUrl.substring(0, videoUrl.lastIndexOf('/') + 1) + "audio";
  console.log("AUDIO: " + audioUrl);
	getVideo([videoUrl, audioUrl]);
};

let getVideo = function(mediaUrls) {
	retrieveMedia(mediaUrls, 0, [], getAudio);
};

let getAudio = function(mediaUrls, mediaDataArray) {
	retrieveMedia(mediaUrls, 1, mediaDataArray, startWork);
};

let retrieveMedia = function(mediaUrls, indexUrl, mediaDataArray, callback) {
  var oReq = new XMLHttpRequest();
  console.log("GET: " + mediaUrls[indexUrl]);
  oReq.open("GET", mediaUrls[indexUrl], true);
  oReq.setRequestHeader("Accept", "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5");
  oReq.setRequestHeader("Pragma", "no-cache");
  oReq.setRequestHeader("Cache-Control", "no-cache");
  oReq.setRequestHeader("Range", "bytes=0-");
  oReq.responseType = "arraybuffer";

  oReq.onload = function (oEvent) {
    console.log("oReq:");
    console.log(oReq);
    var arrayBuffer = oReq.response;
    if (arrayBuffer) {
      console.log("ARRAYBUFFER:");
      console.log(arrayBuffer);
      let mediaData = new Uint8Array(arrayBuffer);
      mediaDataArray.push(mediaData);
      callback(mediaUrls, mediaDataArray);
    }
  };

  oReq.send(null);
};

let startWork = function(mediaUrls, mediaDataArray) {
	let videoData = mediaDataArray[0];
  console.log("VIDEODATA:");
  console.log(videoData);
	let audioData = mediaDataArray[1];
  console.log("AUDIODATA:");
  console.log(audioData);
	initWorker(videoData, audioData, joinMedia);
};

let initWorker = function(videoData, audioData, callback) {
  worker = new Worker("ffmpeg/worker.js");
  worker.onmessage = function (event) {
    let message = event.data;
    if (message.type == "ready") {
      callback(videoData, audioData);
    } else if (message.type == "stdout") {
      console.log(message.data + "\n");
    } else if (message.type == "start") {
      console.log("Worker has received command\n");
    } else if (message.type == "done") {
      let buffers = message.data;
      if (buffers.length) {
        console.log("closed");
      }
      buffers.forEach(function(file) {
        document.getElementsByClassName('ffmpeg-container')[0].appendChild(getDownloadLink(file.data, file.name));
        document.getElementsByClassName('loading-message')[0].style.display = "none";
      });
    }
  };
};

let joinMedia = function(videoData, audioData) {
	runCommand("-i videoFile -i audioFile -c copy -flags global_header full_video.mp4", videoData, audioData);
};

let runCommand = function(text, videoData, audioData) {
    let args = parseArguments(text);
    console.log(args);
    worker.postMessage({
      type: "command",
      arguments: args,
      files: [
        {
          "name": "videoFile",
          "data": videoData
        },
        {
          "name": "audioFile",
          "data": audioData
        }
      ]
    });
};

let parseArguments = function(text) {
  text = text.replace(/\s+/g, ' ');
  let args = [];
  // Allow double quotes to not split args.
  text.split('"').forEach(function(t, i) {
    t = t.trim();
    if ((i % 2) === 1) {
      args.push(t);
    } else {
      args = args.concat(t.split(" "));
    }
  });
  return args;
};

let getDownloadLink = function(fileData, fileName) {
    let a = document.createElement('a');
    a.download = fileName;
    let blob = new Blob([fileData]);
    let src = window.URL.createObjectURL(blob);
    a.href = src;
    a.textContent = 'Click here to download ' + fileName + "!";
    return a;
};

let worker;

window.onload = function() {
	let searchParams = new URLSearchParams(window.location.search);
	if (searchParams.has("d") && searchParams.get("d")) {
		requestPostData(searchParams.get("d"));
	} else {
    document.getElementsByClassName('loading-message')[0].innerHTML = "USAGE: Append ?d=[url-to-vreddit-post] to this url \
    <br> EXAMPLE: ?d=https://www.reddit.com/r/PS4/comments/9e6coo";
  }
};