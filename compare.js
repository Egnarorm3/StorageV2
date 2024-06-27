const startScanner = () => {
    Quagga.init({
      inputStream: {
        type: "LiveStream",
        constraints: {
          facingMode: "environment" // Use the rear camera
        },
        area: { // defines rectangle of the detection/localization area
          top: "0%",    // top offset
          right: "0%",  // right offset
          left: "0%",   // left offset
          bottom: "0%"  // bottom offset
        },
        singleChannel: false // true: only the red color-channel is read
      },
      decoder: {
        readers: ["code_39_reader"] // Specify the barcode type
      }
    }, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      Quagga.start();
    });

    Quagga.onDetected((data) => {
      const code = data.codeResult.code;
      console.log("Detected code:", code); // Log the detected code
      setFlash(true); // Trigger flash
      setTimeout(() => setFlash(false), 100); // Remove flash after 100ms

      if (isCheckoutMode) {
        setScannedIds((prevIds) => {
          if (!prevIds.includes(code)) {
            console.log(`Adding ${code} to scanned IDs`);
            return [...prevIds, code];
          }
          return prevIds;
        });
      } else {
        setFormData({
          ...formData,
          ID: code
        });
      }
    });
  };