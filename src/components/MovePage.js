import React, { useState, useEffect, useRef } from 'react';
import Quagga from '@ericblade/quagga2';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  OrderedList,
  ListItem,
  Heading,
  Input
} from '@chakra-ui/react';
import Select from 'react-select';

export default function MovePage() {
  const [scannedIds, setScannedIds] = useState([]);
  const [formData, setFormData] = useState({
    Campus: null,
    Department: null,
    Room: null,
    ShelfContainer: null
  });
  const [flash, setFlash] = useState(false);
  const [ids, setIds] = useState([]);
  const [shelfContainerOptions, setShelfContainerOptions] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [useBarcodeScanner, setUseBarcodeScanner] = useState(false);
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const barcodeBuffer = useRef("");
  const scanTimeout = useRef(null);

  useEffect(() => {
    fetchDropdownData();

    return () => {
      Quagga.offDetected(onDetected); // Remove event listener
      Quagga.stop(); // Stop the scanner
      if (Quagga.cameraAccess) {
        Quagga.CameraAccess.release(); // Release the camera access
      }
    };
  }, []);

  const fetchDropdownData = async () => {
    try {
      const responseLegend = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=Legend");
      const dataLegend = await responseLegend.json();

      const responseInventory = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=Inventory");
      const dataInventory = await responseInventory.json();

      const idsSet = new Set();
      const campusesSet = new Set();
      const departmentsSet = new Set();
      const roomsSet = new Set();
      const insidersSet = new Set();
      const shelfContainerOptionsSet = new Set();

      dataLegend.forEach(item => {
        if (item.Campus) campusesSet.add(item.Campus);
        if (item.Department) departmentsSet.add(item.Department);
        if (item.Room) roomsSet.add(item.Room);
        if (item.Insiders) insidersSet.add(item.Insiders);
      });

      dataInventory.forEach(item => {
        if (item.ID) idsSet.add(item.ID);
        if (item.Item && insidersSet.has(item.Item)) shelfContainerOptionsSet.add(item.ID);
      });

      setIds(Array.from(idsSet));
      setCampuses(Array.from(campusesSet));
      setDepartments(Array.from(departmentsSet));
      setRooms(Array.from(roomsSet));
      setShelfContainerOptions(Array.from(shelfContainerOptionsSet));
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const handleChange = (selectedOption, { name }) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: selectedOption
    }));
  };

  const onDetected = (data) => {
    const code = data.codeResult.code.toUpperCase();
    console.log("Detected code:", code);
    setFlash(true);
    setTimeout(() => setFlash(false), 100);

    setScannedIds((prevIds) => {
      if (!prevIds.includes(code)) {
        console.log(`Adding ${code} to scanned IDs`);
        return [code, ...prevIds];
      }
      return prevIds;
    });
  };

  const handleBarcodeScan = (e) => {
    if (scanTimeout.current) {
      clearTimeout(scanTimeout.current);
    }

    barcodeBuffer.current += e.target.value;
    e.target.value = "";

    scanTimeout.current = setTimeout(() => {
      if (barcodeBuffer.current.length > 0) {
        const code = barcodeBuffer.current.toUpperCase();
        barcodeBuffer.current = "";
        setScannedIds((prevIds) => {
          const newIds = !prevIds.includes(code) ? [code, ...prevIds] : prevIds;
          console.log(`Scanned IDs after barcode scan: ${JSON.stringify(newIds)}`);
          return newIds;
        });
      }
    }, 300); // Adjust the timeout as needed
  };

  const handleManualSubmit = () => {
    const code = manualCode.toUpperCase();
    if (!ids.includes(code)) {
      alert("Invalid ID. Please enter a valid ID.");
      return;
    }
    setScannedIds((prevIds) => {
      const newIds = !prevIds.includes(code) ? [code, ...prevIds] : prevIds;
      console.log(`Scanned IDs after manual input: ${JSON.stringify(newIds)}`);
      return newIds;
    });
    setManualCode(""); // Clear the input field
  };

  const startScanner = () => {
    Quagga.init({
      inputStream: {
        type: "LiveStream",
        constraints: {
          facingMode: "environment" // Use the rear camera
        },
        area: {
          top: "0%",
          right: "0%",
          left: "0%",
          bottom: "0%"
        },
        target: document.querySelector('#interactive'), // Add this to attach the video stream
        singleChannel: false
      },
      decoder: {
        readers: ["code_39_reader"]
      }
    }, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      Quagga.start();
    });

    Quagga.onDetected(onDetected);
  };

  const removeScannedId = (idToRemove) => {
    setScannedIds((prevIds) => {
      const newIds = prevIds.filter((id) => id !== idToRemove);
      console.log(`Scanned IDs after removal: ${JSON.stringify(newIds)}`);
      return newIds;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleCheckoutSubmit();
  };

  const handleCheckoutSubmit = async () => {
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    const dataToSend = scannedIds.map(id => ({
      ID: id,
      Campus: formData.Campus ? formData.Campus.value : "",
      Department: formData.Department ? formData.Department.value : "",
      Room: formData.Room ? formData.Room.value : "",
      ShelfContainer: formData.ShelfContainer ? formData.ShelfContainer.value : "",
      Date: currentDate
    }));

    console.log("Data to send:", JSON.stringify(dataToSend, null, 2));

    if (dataToSend.length === 0) {
      console.log("No data to send.");
      return;
    }

    // Add a new line in the Update sheet
    try {
      const response = await fetch(
        "https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=Update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(dataToSend)
        }
      );
      const data = await response.json();
      console.log("Response for Update sheet:", data);
    } catch (error) {
      console.error("Error updating the Update sheet:", error);
    }

    // Update the specific row in the Inventory sheet based on the ID
    for (const item of dataToSend) {
      try {
        const response = await fetch(
          `https://sheetdb.io/api/v1/26ca60uj6plvv/ID/${item.ID}?sheet=Inventory`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              Campus: item.Campus,
              Department: item.Department,
              Room: item.Room,
              ShelfContainer: item.ShelfContainer,
              "Last updated": currentDate
            })
          }
        );
        const data = await response.json();
        console.log(`Response for updating ID ${item.ID}:`, data);
      } catch (error) {
        console.error(`Error updating the Inventory sheet for ID ${item.ID}:`, error);
      }
    }

    // Reset scanned IDs
    console.log('Resetting scanned IDs');
    setScannedIds([]);
  };

  const renderOptions = (options) => {
    return options.map((option) => ({
      value: option,
      label: option
    }));
  };

  return (
    <Box className="MovePage" textAlign="center">
      <Heading>Move Items</Heading>
      <Button onClick={() => { setUseBarcodeScanner(false); setUseManualInput(false); }}>
        Use Camera Scanner
      </Button>
      <Button onClick={() => { setUseBarcodeScanner(true); setUseManualInput(false); }}>
        Use Barcode Scanner
      </Button>
      <Button onClick={() => { setUseManualInput(true); setUseBarcodeScanner(false); }}>
        Use Manual Input
      </Button>
      <Box className="form">
        <FormControl>
          <FormLabel>Campus</FormLabel>
          <Select
            name="Campus"
            value={formData.Campus}
            onChange={handleChange}
            options={renderOptions(campuses)}
            placeholder="Select Campus"
          />
        </FormControl>
        <FormControl>
          <FormLabel>Department</FormLabel>
          <Select
            name="Department"
            value={formData.Department}
            onChange={handleChange}
            options={renderOptions(departments)}
            placeholder="Select Department"
          />
        </FormControl>
        <FormControl>
          <FormLabel>Room</FormLabel>
          <Select
            name="Room"
            value={formData.Room}
            onChange={handleChange}
            options={renderOptions(rooms)}
            placeholder="Select Room"
          />
        </FormControl>
        <FormControl>
          <FormLabel>Shelf Container</FormLabel>
          <Select
            name="ShelfContainer"
            value={formData.ShelfContainer}
            onChange={handleChange}
            options={renderOptions(shelfContainerOptions)}
            placeholder="Select Shelf Container"
          />
        </FormControl>
        {useBarcodeScanner && (
          <Input
            type="text"
            autoFocus
            value=""
            onChange={handleBarcodeScan}
            style={{ position: 'absolute', left: '-9999px' }}
          />
        )}
        {useManualInput && (
          <Box>
            <Input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter code manually"
            />
            <Button onClick={handleManualSubmit} mt={2}>Add Code</Button>
          </Box>
        )}
        {!useBarcodeScanner && !useManualInput && (
          <>
            <Button colorScheme="teal" mt={4} onClick={startScanner}>Start Scanning</Button>
            <Box id="interactive" className={`viewport ${flash ? "flash" : ""}`} mt={4} />
          </>
        )}
        <Heading size="md" mt={4}>Scanned IDs:</Heading>

        <OrderedList reversed style={{ listStyleType: 'decimal', counterReset: 'list 0' }}>
          {scannedIds.map((id, index) => (
            <ListItem key={index} style={{ direction: 'ltr', counterIncrement: 'list -1', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px' }}>{scannedIds.length - index}.</span>
              {id} <Button size="xs" colorScheme="red" onClick={() => removeScannedId(id)}>X</Button>
            </ListItem>
          ))}
        </OrderedList>

        <Button colorScheme="teal" mt={4} onClick={handleSubmit}>Submit All</Button>
      </Box>
    </Box>
  );
}
