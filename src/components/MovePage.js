import React, { useState, useEffect, useRef } from 'react';
import Quagga from '@ericblade/quagga2';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  UnorderedList,
  ListItem,
  Heading,
  Input
} from '@chakra-ui/react';

export default function MovePage() {
  const [scannedIds, setScannedIds] = useState([]);
  const [formData, setFormData] = useState({
    Campus: "",
    Department: "",
    Room: "",
    ShelfContainer: ""
  });
  const [flash, setFlash] = useState(false);
  const [ids, setIds] = useState([]);
  const [shelfContainerOptions, setShelfContainerOptions] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [useBarcodeScanner, setUseBarcodeScanner] = useState(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value
    }));
  };

  const onDetected = (data) => {
    const code = data.codeResult.code;
    console.log("Detected code:", code);
    setFlash(true);
    setTimeout(() => setFlash(false), 100);

    setScannedIds((prevIds) => {
      if (!prevIds.includes(code)) {
        console.log(`Adding ${code} to scanned IDs`);
        return [...prevIds, code];
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
        const code = barcodeBuffer.current;
        barcodeBuffer.current = "";
        setScannedIds((prevIds) => {
          const newIds = !prevIds.includes(code) ? [...prevIds, code] : prevIds;
          console.log(`Scanned IDs after barcode scan: ${JSON.stringify(newIds)}`);
          return newIds;
        });
      }
    }, 300); // Adjust the timeout as needed
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
      Campus: formData.Campus,
      Department: formData.Department,
      Room: formData.Room,
      ShelfContainer: formData.ShelfContainer,
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
    return options.map((option, index) => (
      <option key={index} value={option}>{option}</option>
    ));
  };

  return (
    <Box className="MovePage" textAlign="center">
      <Heading>Move Items</Heading>
      <Button onClick={() => setUseBarcodeScanner(!useBarcodeScanner)}>
        {useBarcodeScanner ? "Use Camera Scanner" : "Use Barcode Scanner"}
      </Button>
      <Box className="form">
        <FormControl>
          <FormLabel>Campus</FormLabel>
          <Select name="Campus" value={formData.Campus} onChange={handleChange}>
            <option value="">Select Campus</option>
            {renderOptions(campuses)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Department</FormLabel>
          <Select name="Department" value={formData.Department} onChange={handleChange}>
            <option value="">Select Department</option>
            {renderOptions(departments)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Room</FormLabel>
          <Select name="Room" value={formData.Room} onChange={handleChange}>
            <option value="">Select Room</option>
            {renderOptions(rooms)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Shelf Container</FormLabel>
          <Select name="ShelfContainer" value={formData.ShelfContainer} onChange={handleChange}>
            <option value="">Select Shelf Container</option>
            {renderOptions(shelfContainerOptions)}
          </Select>
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
        {!useBarcodeScanner && (
          <>
            <Button colorScheme="teal" mt={4} onClick={startScanner}>Start Scanning</Button>
            <Box id="interactive" className={`viewport ${flash ? "flash" : ""}`} mt={4} />
          </>
        )}
        <Heading size="md" mt={4}>Scanned IDs:</Heading>
        <UnorderedList>
          {scannedIds.map((id, index) => (
            <ListItem key={index}>
              {id} <Button size="xs" colorScheme="red" onClick={() => removeScannedId(id)}>X</Button>
            </ListItem>
          ))}
        </UnorderedList>
        <Button colorScheme="teal" mt={4} onClick={handleSubmit}>Submit All</Button>
      </Box>
    </Box>
  );
}
