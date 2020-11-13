const SWIPES = Object.freeze({
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    UP: 'UP',
    DOWN: 'DOWN'
});
const IMAGE_FEATURES = Object.freeze({
    TEXT: 'TEXT_DETECTION',
    DOCUMENT: 'DOCUMENT_TEXT_DETECTION',
    LABELS: 'LABEL_DETECTION',
    LANDMARK: 'LANDMARK_DETECTION'

});
const visionkey=GOOGLE_API_VISION_KEY; // it was hardcoded for simplicity, but should be obtained from BE or whole request should go through BE
const translationkey=GOOGLE_API_TRANSLATION_KEY; // same

window.onload = () => {
    console.log('document loaded');
    
    navigator.mediaDevices.getUserMedia({
        video: {
	    facingMode: {
    		exact: 'environment'
	    }
	}
    }).then(stream => {
        const videoTrack = stream.getTracks().find(track => track.kind == 'video');
        const imageCapture = new ImageCapture(videoTrack);
	
        startSwipeDetection((dir) => {
            switch(dir) {
                case SWIPES.UP: {
                    console.log('swipe up');
                    captureAndProcess(imageCapture, [IMAGE_FEATURES.TEXT, IMAGE_FEATURES.LABELS, IMAGE_FEATURES.LANDMARK] );
                    break;
                }
                case SWIPES.RIGHT: {
                    console.log('swipe right');
                    captureAndProcess(imageCapture, [IMAGE_FEATURES.TEXT] );
                    break;
                }
                case SWIPES.DOWN: {
                    console.log('swipe down');
                    captureAndProcess(imageCapture, [IMAGE_FEATURES.LABELS] );
                    break;
                }
                case SWIPES.LEFT: {
                    console.log('swipe left');
                    captureAndProcess(imageCapture, [IMAGE_FEATURES.DOCUMENT] );
                    break;
                }
            }
        });
	
        const lookButton = document.getElementById('look_button');
        lookButton.addEventListener('click', () => {
            console.log('look button click');
            captureAndProcess(imageCapture, [IMAGE_FEATURES.LABELS]);
        });
        const textButton = document.getElementById('text_button');
        textButton.addEventListener('click', () => {
            console.log('text button click');
            captureAndProcess(imageCapture, [IMAGE_FEATURES.TEXT]);
        });
        let shakes = [];
        let prevMotion = null;
        let motionsGravity = [];
        const maxmotions = 200;
        const shakesMaxLength = 4;
        const shakeThreshold = 4;
        const fallThreshold = 4;
        let lastShake = 0;
        const shakesInterval = 1500;
	/*
        const alarmButton = document.getElementById('alarm_button');
        alarmButton.addEventListener('click', () => {
            console.log('alarm button click');
            //sendSMS().then(res => console.log('sms res', res));
            startAlarm();
        });
	*/
        window.ondevicemotion = (motionEvent) => {
        motionsGravity.push({x: motionEvent.accelerationIncludingGravity.x, y: motionEvent.accelerationIncludingGravity.y, z: motionEvent.accelerationIncludingGravity.z});
        if(motionsGravity.length > maxmotions) {
            motionsGravity.shift();
            const fall = motionsGravity.slice(motionsGravity.length-11, motionsGravity.length-1).every(m => Math.abs(m.x) < fallThreshold && Math.abs(m.y) < fallThreshold && Math.abs(m.z) < fallThreshold);
            if(fall) {
                console.log('fall');
                speak(['Я упал, сигнал СОС']);
                startAlarm();
                motionsGravity = [];
            }
        }
        const current = motionEvent.acceleration;;
        if(current && prevMotion) {
            const dx = Math.abs(current.x - prevMotion.x);
            const dy = Math.abs(current.y - prevMotion.y);
            const dz = Math.abs(current.z - prevMotion.z);
            if(dx > shakeThreshold ) { //|| dy > shakeThreshold || dz > shakeThreshold
                shakes.push(Date.now());
            }
        }
        if(shakes.length > shakesMaxLength) {
            shakes.shift();
            if(shakes.every((shake, idx) => (shake  - (shakes[idx-1]||shake)) < 100)) {
                if(Date.now() - lastShake > shakesInterval) {
                    console.log('shake shake');
                    startAlarm();
                    shakes = [];
                    lastShake = Date.now();
                }
            }
        }
        prevMotion = current;
        }
	
    });
}

let voices = null;
function speak(texts) {
console.log('speak', texts);

    if(voices == null || voices.length == 0) {
        voices = window.speechSynthesis.getVoices().filter(v => v.lang=='ru_RU' || v.lang=='uk_UA');
    }
    if(texts) {
        if(typeof texts == 'string') {
            texts = [texts];
        }
        if(Array.isArray(texts)){
            texts.slice(0,5).forEach(text => {
		const preparedText = text && text.split(/[↵,\s]/g).length > 5 ? text.split(/[↵,\s]/g).slice(0,5).join(' ') : text;
		console.log('speaking: ', preparedText);
		const uter = new SpeechSynthesisUtterance(preparedText);
		if(voices && voices.length > 0) {
		    uter.voice = voices[0];
		}
                speechSynthesis.speak(uter);
            })
        }
    }
}
const barcodeDetector = new BarcodeDetector();
function captureAndProcess(imageCapture, features) {
    /*
    imageCapture.grabFrame()
	.then(frame => barcodeDetector.detect(frame))
	.then(barcodes => {
	    const values = barcodes.filter(barcode => barcode.format=='qr_code' && barcode.rawValue.startsWith('inass:'))
	    .map(barcode => barcode.rawValue.substring(6));
	    console.log('barcode values', values);
	    speak(values);
	})
	.catch(err=>{
	    console.log('err', err);
	    setStatus('Ошибка: '+err.message);
	});
    return;
    /**/
    
    imageCapture.takePhoto().then((photo) => { 
	/*
	barcodeDetector.detect(photo)
	.then(barcodes => {
	    const values = barcodes.filter(barcode => barcode.format=='qr_code' && barcode.rawValue.startsWith('inass:'))
	    .map(barcode => barcode.rawValue.substring(6));
	    console.log('barcode values', values);
	    //speak(values);
	})
	.catch(err=>console.log('err', err));
        return;*/
	checkImage(photo, features).then(response => {
            if(response.labelAnnotations) {
                const labels = response.labelAnnotations.slice(0,5).map(label => label.description);
                translate(labels).then(translatedLabels => {
		    setStatus(translatedLabels);
		    speak(translatedLabels)
		});
            }
            if(response.textAnnotations) {
                const texts = response.textAnnotations.slice(0, 5).map(text => text.description);
		console.log('texts extracted', texts);
		setStatus(texts);
                speak(texts);
            }
            if(response.fullTextAnnotation) {
                const text = response.fullTextAnnotation.text;
		addStatus(text);
                //speak([text]);
            }
            
        }).catch(err => {
	    console.log('err', err)
	});
    }).catch(ex => console.log('ex', ex.message));
}

// https://gist.github.com/kylemcdonald/7873f9a5101a2537e190c96c38d36d44

function blobToBase64(blob) {
    return new Promise(resolve => {
        const reader = new window.FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result);
    });
}




async function checkImage(imageBlob, featuresNames) {
    const b64 = await blobToBase64(imageBlob);
    const imageInBase64 = b64.replace('data:image/jpeg;base64,', ''); // remove content type
    const features = featuresNames.map(feature => ({type: feature, maxResults: 5}));
    const request = {
        "requests":[
          {
            "image":{ "content": imageInBase64 },
            features,
            imageContext: {
                languageHints: ['ru', 'uk', 'en']
            }
          }
        ]
    };
    const responseRaw = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${visionkey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
    });
    const responseJson = await responseRaw.json();
    return responseJson.responses[0];

}
function startSwipeDetection(handleswipe) {
    const touchsurface = document.getElementById('gesturezone');
    const threshold = 150; //required min distance traveled to be considered swipe
    const allowedTime = 300; // maximum time allowed to travel that distance
    const restraintOtherDirection = 100; // maximum distance allowed at the same time in perpendicular direction

    let startX = 0;
    let startY = 0;
    let dist = 0;
    let startTime = 0;



    touchsurface.addEventListener('touchstart', function(e){
        const touchobj = e.changedTouches[0];
        dist = 0;
        startX = touchobj.pageX;
        startY = touchobj.pageY;
        startTime = new Date().getTime(); // record time when finger first makes contact with surface
        e.preventDefault();
    }, false)

    touchsurface.addEventListener('touchmove', function(e){
        e.preventDefault(); // prevent scrolling when inside DIV
    }, false)

    touchsurface.addEventListener('touchend', function(e){
        const touchobj = e.changedTouches[0];
        distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
        distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
        const elapsedTime = new Date().getTime() - startTime // get time elapsed
        if (elapsedTime <= allowedTime){ // first condition for awipe met
            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraintOtherDirection){ // 2nd condition for horizontal swipe met
                handleswipe( (distX < 0)? SWIPES.LEFT : SWIPES.RIGHT) ;// if dist traveled is negative, it indicates left swipe
            }
            else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraintOtherDirection){ // 2nd condition for vertical swipe met
                handleswipe( (distY < 0)? SWIPES.UP : SWIPES.DOWN); // if dist traveled is negative, it indicates up swipe
            }
        }
        e.preventDefault();
    }, false)
}

async function translate(words) {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${translationkey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        redirect: "follow",
        referrer: "no-referrer",
        body: JSON.stringify({
          q: words,
          target: 'ru',
          source: 'en'
        })
      })
    const responseJson = await response.json();
    if(responseJson.error) {
        console.log('translation error', responseJson.error)
        throw new Error(responseJson.error);
    } else {
        return responseJson.data.translations.map(t => t.translatedText);
    }
}

function sendSMS() {
    return fetch('/sms').then(res => res.json()).then(res => res);
}

const AlarmTimeout = 10000;
function startAlarm() {
    const alarmOverlay = document.getElementById('alarm_overlay');
    if(alarmOverlay.style.display != 'block') {
        const alarmDeadline = Date.now() + AlarmTimeout;

        function handleClickForDisarm() {
            clearInterval(intervalId);
            alarmOverlay.style.display = 'none';
            alarmOverlay.removeEventListener('click',handleClickForDisarm);
        }

        alarmOverlay.addEventListener('click',handleClickForDisarm);
        alarmOverlay.style.display = 'block';
        const secondsLeftEl = document.getElementById('alarm_time_left');
        const intervalId = setInterval(() => {
            const secondsLeft = Math.round((alarmDeadline - Date.now())/1000);
            alarmOverlay.style.backgroundColor= secondsLeft %2 ? 'peru': 'lightpink';
            if(secondsLeft < 0) {
                clearInterval(intervalId);
                console.log('SOS SOS');
            } else {
                secondsLeftEl.innerHTML = secondsLeft;
            }
        }, 1000);
    }
}

function setStatus(text) {
    const preparedText = text && text.length > 0 ? (Array.isArray(text) ? text.join('<br/>') : text) : 'Ничего не обнаружено';
    document.getElementById('status').innerHTML = preparedText;
}
function addStatus(text) {
    document.getElementById('status').innerHTML += ('<br/>---<br/>' + text);
}