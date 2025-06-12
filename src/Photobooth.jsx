import React, { useState, useRef, useEffect } from "react";
import "./PhotoBooth.css";

const PhotoBooth = () => {
    const [stream, setStream] = useState(null);
    const [capturedImages, setCapturedImages] = useState([]);
    const [filter, setFilter] = useState("none");
    const [isCapturing, setIsCapturing] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [photosTaken, setPhotosTaken] = useState(0);
    const [flashActive, setFlashActive] = useState(false);
    const [stripImageUrl, setStripImageUrl] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const stripCanvasRef = useRef(null);

    //PRINTING MODAL
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printTwoStrips, setPrintTwoStrips] = useState(false);

    // Available filters
    const filters = [
        { name: "None", value: "none" },
        { name: "Grayscale", value: "grayscale(100%)" },
        { name: "Sepia", value: "sepia(100%)" },
        { name: "Invert", value: "invert(100%)" },
        { name: "Blur", value: "blur(4px)" },
    ];

    // Initialize webcam
    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                    mirrored: true,
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

        // Cleanup function to stop camera when component unmounts
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Manage the photo capture sequence
    useEffect(() => {
        if (!isCapturing) return;

        if (photosTaken >= 4) {
            // We've taken all 4 photos, stop capturing
            setIsCapturing(false);
            setCountdown(null);
            return;
        }

        if (countdown === null) {
            // Start the countdown for the first or next photo
            setCountdown(4);
        }

        if (countdown > 0) {
            // Continue countdown
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            // Take photo when countdown reaches 0
            capturePhoto();
            setPhotosTaken(photosTaken + 1);
            setCountdown(photosTaken < 3 ? 4 : null); // Reset countdown if more photos needed
        }
    }, [isCapturing, countdown, photosTaken]);

    // Create photo strip when all 4 photos are taken
    useEffect(() => {
        if (capturedImages.length === 4) {
            createPhotoStrip();
        }
    }, [capturedImages]);

    // Flash effect
    useEffect(() => {
        if (flashActive) {
            const timer = setTimeout(() => {
                setFlashActive(false);
                console.log("flash false");
            }, 300); // Flash duration
            return () => clearTimeout(timer);
        }
    }, [flashActive]);

    // Take a photo
    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            // Activate flash effect
            setFlashActive(true);
            console.log("flash true");

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            // Set canvas dimensions to match video
            canvas.width = video.clientWidth;
            canvas.height = video.clientHeight;

            // Draw the video frame to the canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Apply current filter to canvas
            if (filter !== "none") {
                context.filter = filter;
                context.drawImage(canvas, 0, 0);
                context.filter = "none";
            }

            // Get the image data URL
            const imageDataURL = canvas.toDataURL("image/png");
            setCapturedImages((prev) => [...prev, imageDataURL]);
        }
    };

    // Create a single vertical photo strip from all 4 photos
    const createPhotoStrip = () => {
        if (!stripCanvasRef.current) return;

        const canvas = stripCanvasRef.current;
        const ctx = canvas.getContext("2d");

        // Determine dimensions for the strip
        const photoWidth = 300;
        const photoHeight = 225; // 4:3 aspect ratio
        const padding = 20;
        const margin = 20;
        const titleHeight = 50;
        const footerHeight = 40;

        // Set canvas size for the strip (increased to prevent cutting)
        canvas.width = photoWidth + padding * 2;
        canvas.height =
            titleHeight +
            photoHeight * 4 +
            margin * 3 +
            padding * 2 +
            footerHeight;

        // Create pink gradient background
        const gradient = ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height
        );
        gradient.addColorStop(0, "#ff9a9e");
        gradient.addColorStop(1, "#fad0c4");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add decorative header
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Pacifico, cursive";
        ctx.textAlign = "center";
        ctx.fillText(
            "ChamBeau PhotoBooth",
            canvas.width / 2,
            titleHeight / 2 + 30
        );

        // Draw date at the bottom
        const currentDate = new Date().toLocaleDateString();
        ctx.font = "14px Montserrat, sans-serif";
        ctx.fillText(
            currentDate,
            canvas.width / 2,
            canvas.height - footerHeight / 2
        );

        //load and draw each image onto the strip canvas
        const loadImages = async () => {
            for (let i = 0; i < capturedImages.length; i++) {
                const img = new Image();
                img.src = capturedImages[i];
                await new Promise((resolve) => {
                    img.onload = () => {
                        const yPos =
                            titleHeight + padding + i * (photoHeight + margin);

                        //draw white border/frame
                        ctx.fillStyle = "white";
                        ctx.fillRect(
                            padding - 3,
                            yPos - 3,
                            photoWidth + 6,
                            photoHeight + 6
                        );

                        // Draw the photo
                        ctx.drawImage(
                            img,
                            padding,
                            yPos,
                            photoWidth,
                            photoHeight
                        );

                        resolve();
                    };
                });
            }

            //Generate the final strip URL
            setStripImageUrl(canvas.toDataURL("image/png"));
        };

        loadImages();
    };

    // Start the auto-capture sequence
    const startAutoCapture = () => {
        setCapturedImages([]);
        setStripImageUrl(null);
        setPhotosTaken(0);
        setIsCapturing(true);
        setCountdown(5);
    };

    // Reset everything and start over
    const startOver = () => {
        setCapturedImages([]);
        setStripImageUrl(null);
        setIsCapturing(false);
        setCountdown(null);
        setPhotosTaken(0);

        // Reinitialize the camera to fix white display issue
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }

        const startCamera = async () => {
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
                console.error("Error accessing camera:", error);
            }
        };

        startCamera();
    };

    // Save the photo strip
    const savePhotoStrip = () => {
        if (stripImageUrl) {
            const link = document.createElement("a");
            link.href = stripImageUrl;
            link.download = `chambeau-photostrip-${new Date().getTime()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    // Print the photo strip with user choice for 1 or 2 strips
    const printPhotoStrip = (printTwoStrips) => {
        if (stripImageUrl) {
            const printWindow = window.open("", "_blank");

            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>ChamBeau PhotoBooth Strip</title>
                            <style>
                                @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
                                body {
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                    background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
                                }
                                .print-container {
                                    background: white;
                                    padding: 20px;
                                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                                    border-radius: 10px;
                                    text-align: center;
                                    display: ${
                                        printTwoStrips ? "flex" : "block"
                                    };
                                    gap: 10px;
                                }
                                .photo {
                                    max-height: 85vh;
                                    max-width: ${
                                        printTwoStrips ? "48%" : "100%"
                                    };
                                    border: 8px solid white;
                                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                                }
                                @media print {
                                    body { background: none; }
                                    .print-container { box-shadow: none; padding: 0; }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="print-container">
                                <img class="photo" src="${stripImageUrl}" />
                                ${
                                    printTwoStrips
                                        ? `<img class="photo" src="${stripImageUrl}" />`
                                        : ""
                                }
                            </div>
                            <script>
                                window.onload = function() {
                                    setTimeout(function() {
                                        window.print();
                                        window.close();
                                    }, 500);
                                };
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }
        }
    };

    // Apply a different filter
    const changeFilter = (newFilter) => {
        setFilter(newFilter);
    };

    //PRINT FUNCTION
    const handlePrint = (twoStrips) => {
        setPrintTwoStrips(twoStrips);
        setShowPrintModal(false);
        printPhotoStrip(twoStrips);
    };

    return (
        <div className="photobooth-container">
            <h1 className="photobooth-title">
                <span className="cham">Cham</span>
                <span className="beau">Beau</span> PhotoBooth
            </h1>

            <div className="photobooth-panel">
                {capturedImages.length < 4 ? (
                    // Camera view and capture interface
                    <div className="camera-container">
                        <div
                            className={`video-container ${
                                flashActive ? "flash-active" : ""
                            }`}
                        >
                            <video
                                ref={videoRef}
                                style={{ filter }}
                                className="video-feed"
                                autoPlay
                                playsInline
                            />

                            {isCapturing && countdown !== null && (
                                <div className="countdown-overlay">
                                    <div className="countdown-number">
                                        {countdown}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* <div className="filter-buttons">
                            {filters.map((f) => (
                                <button
                                    key={f.value}
                                    onClick={() => changeFilter(f.value)}
                                    className={`filter-button ${
                                        filter === f.value
                                            ? "filter-active"
                                            : ""
                                    }`}
                                >
                                    {f.name}
                                </button>
                            ))}
                        </div> */}

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
                    // Display the photo strip
                    <div className="results-container">
                        <div className="photo-strip">
                            {stripImageUrl && (
                                <div className="strip-container">
                                    <img
                                        src={stripImageUrl}
                                        alt="Photo Strip"
                                        className="strip-image"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="action-buttons">
                            <button
                                onClick={startOver}
                                className="new-strip-button"
                            >
                                New Strip
                            </button>
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
                        </div>
                    </div>
                )}
            </div>

            {showPrintModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <p>Select Print Option</p>
                        <button onClick={() => handlePrint(false)}>
                            Print 1 Strip
                        </button>
                        <button onClick={() => handlePrint(true)}>
                            Print 2 Strips
                        </button>
                        <button onClick={() => setShowPrintModal(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden canvas used for capturing photos */}
            <canvas ref={canvasRef} className="hidden-canvas" />

            {/* Hidden canvas for creating the photo strip */}
            <canvas ref={stripCanvasRef} className="hidden-canvas" />
        </div>
    );
};

export default PhotoBooth;
