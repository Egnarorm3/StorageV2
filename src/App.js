import "./styles.css";
import React, { useState } from "react";
import Quagga from "@ericblade/quagga2"; // Correct import for @ericblade/quagga2

export default function App() {
  const [formData, setFormData] = useState({
    ID: "",
    Campus: "",
    Department: "",
    Room: "",
    ShelfContainer: ""
  });

  const [scannedIds, setScannedIds] = useState([]);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    const formDataWithDate = {
      ...formData,
      Date: currentDate
    };

    const formEle = document.querySelector("form");
    const formDatab = new FormData(formEle);
    formDatab.append("Date", currentDate);

    fetch(
      "https://script.google.com/macros/s/AKfycbxo9-zMuPNpRT3mAKXM7Nn7OI66jqRSTb0EQLq-RmjlVo23IJwaWaiXCLWIF0eEvyQcGw/exec",
      {
        method: "POST",
        body: formDatab
      }
    )
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.log(error);
      });
  };

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

  const handleCheckoutSubmit = () => {
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    scannedIds.forEach((id, index) => {
      setTimeout(() => {
        const formDatab = new FormData();
        formDatab.append("ID", id);
        formDatab.append("Campus", formData.Campus);
        formDatab.append("Department", formData.Department);
        formDatab.append("Room", formData.Room);
        formDatab.append("ShelfContainer", formData.ShelfContainer);
        formDatab.append("Date", currentDate);

        console.log(`Submitting ID ${id} (Index ${index})`);

        fetch(
          "https://script.google.com/macros/s/AKfycbxo9-zMuPNpRT3mAKXM7Nn7OI66jqRSTb0EQLq-RmjlVo23IJwaWaiXCLWIF0eEvyQcGw/exec",
          {
            method: "POST",
            body: formDatab
          }
        )
          .then((res) => res.json())
          .then((data) => {
            console.log(`Response for ID ${id}:`, data);
          })
          .catch((error) => {
            console.error(`Error for ID ${id}:`, error);
          });
      }, index * 200); // Delay each submission by 200ms
    });

    // Reset scanned IDs
    setScannedIds([]);
  };

  const ids = [
    // Put your list of IDs here
  ];

  const campuses = ["Sinclair", "Kerr", "Storage"];
  const departments = ["IT", "Arabic", "Other"];
  const rooms = [
    "Grade 1", "Grade 2", "Grade 3A", "Grade 3B", "Grade 4A", "Grade 4B", 
    "Grade 5 Boys", "Grade 5 Girls", "Grade 6 Girls", "Grade 7 Girls", 
    "Grade 8 Girls", "Grade 9 Girls", "Grade 10 Girls", "Grade 11 Girls", 
    "Grade 6 Boys", "Grade 7 Boys", "Grade 8 Boys", "Grade 9 Boys", 
    "Grade 10 Boys", "Grade 11 Boys", "Grade 12 Boys"
  ];

  const renderOptions = (options) => {
    return options.map((option, index) => (
      <option key={index} value={option}>{option}</option>
    ));
  };

  return (
    <div className="App">
      <h1>Update Item Form Test</h1>
      <h2>This is a test to update items on the sheet</h2>
      <div>
        {!isCheckoutMode ? (
          <form className="form" onSubmit={handleSubmit}>
            <label>
              ID:
              <select name="ID" value={formData.ID} onChange={handleChange}>
                <option value="">Select ID</option>
                {renderOptions(ids)}
              </select>
            </label>
            <button type="button" onClick={startScanner}>Scan Barcode</button>
            <label>
              Campus:
              <select name="Campus" value={formData.Campus} onChange={handleChange}>
                <option value="">Select Campus</option>
                {renderOptions(campuses)}
              </select>
            </label>
            <label>
              Department:
              <select name="Department" value={formData.Department} onChange={handleChange}>
                <option value="">Select Department</option>
                {renderOptions(departments)}
              </select>
            </label>
            <label>
              Room:
              <select name="Room" value={formData.Room} onChange={handleChange}>
                <option value="">Select Room</option>
                {renderOptions(rooms)}
              </select>
            </label>
            <label>
              Shelf Container:
              <input 
                type="text" 
                name="ShelfContainer" 
                value={formData.ShelfContainer} 
                onChange={handleChange} 
                placeholder="Shelf Container" 
              />
            </label>
            <button type="submit">Submit</button>
          </form>
        ) : (
          <div>
            <form className="form" onSubmit={(e) => e.preventDefault()}>
              <label>
                Campus:
                <select name="Campus" value={formData.Campus} onChange={handleChange}>
                  <option value="">Select Campus</option>
                  {renderOptions(campuses)}
                </select>
              </label>
              <label>
                Department:
                <select name="Department" value={formData.Department} onChange={handleChange}>
                  <option value="">Select Department</option>
                  {renderOptions(departments)}
                </select>
              </label>
              <label>
                Room:
                <select name="Room" value={formData.Room} onChange={handleChange}>
                  <option value="">Select Room</option>
                  {renderOptions(rooms)}
                </select>
              </label>
              <label>
                Shelf Container:
                <input 
                  type="text" 
                  name="ShelfContainer" 
                  value={formData.ShelfContainer} 
                  onChange={handleChange} 
                  placeholder="Shelf Container" 
                />
              </label>
              <button type="button" onClick={startScanner}>Start Scanning</button>
              <div>
                <h3>Scanned IDs:</h3>
                <ul>
                  {scannedIds.map((id, index) => (
                    <li key={index}>{id}</li>
                  ))}
                </ul>
              </div>
              <button type="button" onClick={handleCheckoutSubmit}>Submit All</button>
            </form>
          </div>
        )}
        <button type="button" onClick={() => setIsCheckoutMode(!isCheckoutMode)}>
          {isCheckoutMode ? "Switch to Single Scan Mode" : "Switch to Checkout Mode"}
        </button>
        <div id="interactive" className={`viewport ${flash ? "flash" : ""}`} />
      </div>
    </div>
  );
}
