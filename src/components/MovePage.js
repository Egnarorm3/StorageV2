import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  UnorderedList,
  ListItem,
  Heading,
  InputGroup,
  InputRightElement,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import PopupScanner from './PopupScanner';

export default function MovePage() {
  const [scannedIds, setScannedIds] = useState([]);
  const [formData, setFormData] = useState({
    Campus: "",
    Department: "",
    Room: "",
    ShelfContainer: ""
  });
  const [ids, setIds] = useState([]);
  const [shelfContainerOptions, setShelfContainerOptions] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentField, setCurrentField] = useState(null);

  useEffect(() => {
    fetchDropdownData();
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

  const onDetected = (code) => {
    if (currentField) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        [currentField]: code
      }));
    } else {
      setScannedIds((prevIds) => {
        if (!prevIds.includes(code)) {
          console.log(`Adding ${code} to scanned IDs`);
          return [...prevIds, code];
        }
        return prevIds;
      });
    }
  };

  const startScannerForField = (field) => {
    setCurrentField(field);
    onOpen();
  };

  const startScanner = () => {
    setCurrentField(null);
    onOpen();
  };

  const removeScannedId = (idToRemove) => {
    setScannedIds((prevIds) => prevIds.filter((id) => id !== idToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleCheckoutSubmit();
  };

  const handleCheckoutSubmit = async () => {
    const currentDate = new Date().toISOString().split('T')[0];

    const dataToSend = scannedIds.map(id => ({
      ID: id,
      Campus: formData.Campus,
      Department: formData.Department,
      Room: formData.Room,
      ShelfContainer: formData.ShelfContainer,
      Date: currentDate
    }));

    console.log("Data to send:", dataToSend);

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
      <Box as="form" className="form" onSubmit={handleSubmit}>
        <FormControl>
          <FormLabel>Campus</FormLabel>
          <InputGroup>
            <Select name="Campus" value={formData.Campus} onChange={handleChange}>
              <option value="">Select Campus</option>
              {renderOptions(campuses)}
            </Select>
            <InputRightElement width="4.5rem">
              <Button h="1.75rem" size="sm" onClick={() => startScannerForField('Campus')}>Scan</Button>
            </InputRightElement>
          </InputGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Department</FormLabel>
          <InputGroup>
            <Select name="Department" value={formData.Department} onChange={handleChange}>
              <option value="">Select Department</option>
              {renderOptions(departments)}
            </Select>
            <InputRightElement width="4.5rem">
              <Button h="1.75rem" size="sm" onClick={() => startScannerForField('Department')}>Scan</Button>
            </InputRightElement>
          </InputGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Room</FormLabel>
          <InputGroup>
            <Select name="Room" value={formData.Room} onChange={handleChange}>
              <option value="">Select Room</option>
              {renderOptions(rooms)}
            </Select>
            <InputRightElement width="4.5rem">
              <Button h="1.75rem" size="sm" onClick={() => startScannerForField('Room')}>Scan</Button>
            </InputRightElement>
          </InputGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Shelf Container</FormLabel>
          <InputGroup>
            <Select name="ShelfContainer" value={formData.ShelfContainer} onChange={handleChange}>
              <option value="">Select Shelf Container</option>
              {renderOptions(shelfContainerOptions)}
            </Select>
            <InputRightElement width="4.5rem">
              <Button h="1.75rem" size="sm" onClick={() => startScannerForField('ShelfContainer')}>Scan</Button>
            </InputRightElement>
          </InputGroup>
        </FormControl>
        {currentField && <Text>Scanning for: {currentField}</Text>}
        <Button colorScheme="teal" mt={4} onClick={startScanner}>Start Scanning</Button>
        <Heading size="md" mt={4}>Scanned IDs:</Heading>
        <UnorderedList>
          {scannedIds.map((id, index) => (
            <ListItem key={index}>
              {id} <Button size="xs" colorScheme="red" onClick={() => removeScannedId(id)}>X</Button>
            </ListItem>
          ))}
        </UnorderedList>
        <Button type="submit" colorScheme="teal" mt={4}>Submit All</Button>
      </Box>
      <PopupScanner isOpen={isOpen} onClose={onClose} onDetected={onDetected} />
    </Box>
  );
}
