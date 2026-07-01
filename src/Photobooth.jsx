import React, { useState, useRef, useEffect } from "react";
import "./PhotoBooth.css";

const PhotoBooth = () => {
    const [stream, setStream] = useState(null);
    const [capturedImages, setCapturedImages] = useState([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [photosTaken, setPhotosTaken] = useState(0);
    const [flashActive, setFlashActive] = useState(false);
    const [stripImageUrl, setStripImageUrl] = useState(null);
    const [videoAspectRatio, setVideoAspectRatio] = useState(4 / 3); // Track camera ratio dynamically

    // Background Color State
    const [stripBg, setStripBg] = useState("#ffb7b2"); // Default Pink

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const stripCanvasRef = useRef(null);

    const [showPrintModal, setShowPrintModal] = useState(false);

    const bgColors = [
        { name: "Pink", hex: "#ffb7b2" },
        { name: "Blue", hex: "#b3e5fc" },
        { name: "Yellow", hex: "#fff9c4" },
        { name: "Purple", hex: "#e1bee7" },
    ];

    // Initialize webcam
    useEffect(() => {
        const startCamera = async () => {
            try {
                if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                }

                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (error) {
                console.error("Error accessing camera:", error);
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Track dynamic video metadata sizes
    const handleVideoMetadata = () => {
        if (videoRef.current) {
            const width = videoRef.current.videoWidth;
            const height = videoRef.current.videoHeight;
            if (width && height) {
                setVideoAspectRatio(width / height);
            }
        }
    };

    // Manage the photo capture sequence
    useEffect(() => {
        if (!isCapturing) return;

        if (photosTaken >= 4) {
            setIsCapturing(false);
            setCountdown(null);
            return;
        }

        if (countdown === null) {
            setCountdown(3);
        }

        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            capturePhoto();
            setPhotosTaken(photosTaken + 1);
            setCountdown(photosTaken < 3 ? 3 : null);
        }
    }, [isCapturing, countdown, photosTaken]);

    // Trigger strip generation instantly whenever images OR background changes
    useEffect(() => {
        if (capturedImages.length === 4) {
            createPhotoStrip();
        }
    }, [capturedImages, stripBg]);

    // Flash effect
    useEffect(() => {
        if (flashActive) {
            const timer = setTimeout(() => {
                setFlashActive(false);
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [flashActive]);

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            setFlashActive(true);
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            // 1. CAPTURE THE VIEWPORT: Use the exact layout size displayed on your screen
            const displayWidth = video.clientWidth;
            const displayHeight = video.clientHeight;

            // Set the canvas to match the exact dimensions of your CSS preview box
            canvas.width = displayWidth;
            canvas.height = displayHeight;

            context.save();
            // 2. Mirror-flip transform to match the live viewfinder orientation
            context.translate(canvas.width, 0);
            context.scale(-1, 1);

            // 3. Directly draw what is visible in the HTML element container box
            // This forces the browser to match its internal layout engine instead of raw hardware metadata
            context.drawImage(video, 0, 0, displayWidth, displayHeight);
            context.restore();

            const imageDataURL = canvas.toDataURL("image/png");
            setCapturedImages((prev) => [...prev, imageDataURL]);
        }
    };

    const createPhotoStrip = () => {
        if (!stripCanvasRef.current || capturedImages.length !== 4) return;

        const canvas = stripCanvasRef.current;
        const ctx = canvas.getContext("2d");

        // Maintain structural layout width, compute height dynamically to protect aspect ratio
        const photoWidth = 300;
        const photoHeight = photoWidth / videoAspectRatio;
        const padding = 20;
        const margin = 20;
        const titleHeight = 60;
        const footerHeight = 40;

        canvas.width = photoWidth + padding * 2;
        canvas.height =
            titleHeight +
            photoHeight * 4 +
            margin * 3 +
            padding * 2 +
            footerHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fill background
        ctx.fillStyle = stripBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Title
        ctx.fillStyle =
            stripBg === "#ffffff" || stripBg === "#e1bee7"
                ? "#111111"
                : "#222222";
        ctx.font = "bold 16px Montserrat, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
            "CHAMBEAU PHOTOBOOTH",
            canvas.width / 2,
            titleHeight / 2 + 10,
        );

        // Footer Date
        const currentDate = new Date().toLocaleDateString();
        ctx.font = "11px Montserrat, sans-serif";
        ctx.fillStyle =
            stripBg === "#ffffff" || stripBg === "#e1bee7"
                ? "#555555"
                : "#333333";
        ctx.fillText(
            currentDate,
            canvas.width / 2,
            canvas.height - footerHeight / 2,
        );

        const loadAndDraw = async () => {
            for (let i = 0; i < capturedImages.length; i++) {
                const img = new Image();
                img.src = capturedImages[i];
                await new Promise((resolve) => {
                    img.onload = () => {
                        const yPos =
                            titleHeight + padding + i * (photoHeight + margin);

                        // Photo Mounting Border
                        ctx.fillStyle = "#ffffff";
                        ctx.fillRect(
                            padding - 3,
                            yPos - 3,
                            photoWidth + 6,
                            photoHeight + 6,
                        );

                        // Drawn image retains true camera ratio
                        ctx.drawImage(
                            img,
                            padding,
                            yPos,
                            photoWidth,
                            photoHeight,
                        );
                        resolve();
                    };
                });
            }

            // Outer cutting guidelines
            ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

            setStripImageUrl(canvas.toDataURL("image/png"));
        };

        loadAndDraw();
    };

    const startAutoCapture = () => {
        setCapturedImages([]);
        setStripImageUrl(null);
        setPhotosTaken(0);
        setIsCapturing(true);
        setCountdown(3);
    };

    const startOver = async () => {
        setCapturedImages([]);
        setStripImageUrl(null);
        setIsCapturing(false);
        setCountdown(null);
        setPhotosTaken(0);

        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (error) {
            console.error("Error restarting camera feed:", error);
        }
    };

    const savePhotoStrip = () => {
        if (stripImageUrl) {
            const link = document.createElement("a");
            link.href = stripImageUrl;
            link.download = `photostrip-${new Date().getTime()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const printPhotoStrip = (twoStrips) => {
        if (stripImageUrl) {
            const printWindow = window.open("", "_blank");
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Print Strip</title>
                            <style>
                                body {
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                    background: #ffffff;
                                }
                                .print-container {
                                    display: flex;
                                    align-items: center;
                                    gap: 0px;
                                }
                                .photo {
                                    max-height: 95vh;
                                    object-fit: contain;
                                    display: block;
                                }
                                .divider {
                                    border-left: 1px dashed rgba(0, 0, 0, 0.2);
                                    height: 92vh;
                                    margin: 0 10px;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="print-container">
                                <img class="photo" src="${stripImageUrl}" />
                                ${twoStrips ? `<div class="divider"></div><img class="photo" src="${stripImageUrl}" />` : ""}
                            </div>
                            <script>
                                window.onload = function() {
                                    setTimeout(function() {
                                        window.print();
                                        window.close();
                                    }, 350);
                                };
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }
        }
    };

    return (
        <div className="photobooth-container">
            <h1 className="photobooth-title">
                <span className="cham">Cham</span>
                <span className="beau">Beau</span> PhotoBooth
            </h1>

            <div className="photobooth-panel">
                {capturedImages.length < 4 ? (
                    <div className="camera-container">
                        <div
                            className={`video-container ${flashActive ? "flash-active" : ""}`}
                        >
                            <video
                                ref={videoRef}
                                className="video-feed"
                                autoPlay
                                playsInline
                                onLoadedMetadata={handleVideoMetadata}
                            />
                            {isCapturing && countdown !== null && (
                                <div className="countdown-overlay">
                                    <div className="countdown-number">
                                        {countdown}
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isCapturing ? (
                            <button
                                onClick={startAutoCapture}
                                className="start-button"
                            >
                                Start Photo Sequence
                            </button>
                        ) : (
                            <div className="capture-status">
                                <p>Taking photo {photosTaken + 1} of 4</p>
                                <button
                                    onClick={() => setIsCapturing(false)}
                                    className="cancel-button"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="results-container">
                        <div className="color-picker-container">
                            <span className="color-picker-label">
                                Strip Color
                            </span>
                            <div className="color-swatches">
                                {bgColors.map((color) => (
                                    <button
                                        key={color.hex}
                                        className={`swatch-btn ${stripBg === color.hex ? "active-swatch" : ""}`}
                                        style={{ backgroundColor: color.hex }}
                                        onClick={() => setStripBg(color.hex)}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="photo-strip">
                            {stripImageUrl && (
                                <div className="strip-container">
                                    <img
                                        src={stripImageUrl}
                                        alt="Photo Strip Output"
                                        className="strip-image"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="action-buttons">
                            <button
                                onClick={savePhotoStrip}
                                className="save-button"
                            >
                                Save Strip
                            </button>
                            <button
                                onClick={() => setShowPrintModal(true)}
                                className="print-button"
                            >
                                Print Strip
                            </button>
                            <button
                                onClick={startOver}
                                className="new-strip-button"
                            >
                                New Strip
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showPrintModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <p>Select Print Option</p>
                        <button
                            onClick={() => {
                                setShowPrintModal(false);
                                printPhotoStrip(false);
                            }}
                        >
                            Print 1 Strip
                        </button>
                        <button
                            onClick={() => {
                                setShowPrintModal(false);
                                printPhotoStrip(true);
                            }}
                        >
                            Print 2 Strips
                        </button>
                        <button onClick={() => setShowPrintModal(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} className="hidden-canvas" />
            <canvas ref={stripCanvasRef} className="hidden-canvas" />
        </div>
    );
};

export default PhotoBooth;
