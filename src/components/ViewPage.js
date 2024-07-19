import React, { useState, useEffect, useRef, useContext } from 'react';
import Quagga from '@ericblade/quagga2';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  Heading,
  Image,
  Text,
  SimpleGrid,
  VStack,
  CloseButton
} from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GridHighlightContext } from '../App';

export default function ViewPage() {
  const [formData, setFormData] = useState({
    ID: "",
    Campus: "",
    Department: "",
    Room: "",
    ShelfContainer: "",
    ImageURL: "",
    Description: ""
  });
  const [flash, setFlash] = useState(false);
  const [ids, setIds] = useState([]);
  const [shelfContainerOptions, setShelfContainerOptions] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [containsItems, setContainsItems] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [itemExistsInGrid, setItemExistsInGrid] = useState(false);
  const [highlightID, setHighlightID] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { setHighlightItem } = useContext(GridHighlightContext);
  const prevID = useRef(null);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const id = query.get('id');
    if (id) {
      setFormData(prevFormData => ({ ...prevFormData, ID: id }));
      fetchDataForID(id);
    }
    fetchDropdownData();
  }, [location]);

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

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value
    }));

    if (name === 'ID' && value) {
      await fetchDataForID(value);
    }
  };

  const fetchDataForID = async (id) => {
    try {
      const response = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv/search?ID=${id}&sheet=Inventory`);
      const data = await response.json();
      if (data.length > 0) {
        const item = data[0];
        setFormData((prevFormData) => ({
          ...prevFormData,
          Campus: item.Campus,
          Department: item.Department,
          Room: item.Room,
          ShelfContainer: item.ShelfContainer,
          ImageURL: item.ImageURL || "No Image", // Set the ImageURL from the fetched data
          Description: item.Description || "No Description"
        }));
        fetchContainsItems(item.ID);
        checkItemInGrid(item);
      }
    } catch (error) {
      console.error(`Error fetching data for ID ${id}:`, error);
    }
  };

  const fetchContainsItems = async (shelfContainerID) => {
    try {
      const response = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv/search?ShelfContainer=${shelfContainerID}&sheet=Inventory`);
      const data = await response.json();
      setContainsItems(data);
    } catch (error) {
      console.error(`Error fetching contains items for ShelfContainer ${shelfContainerID}:`, error);
    }
  };

  const checkItemInGrid = async (item) => {
    try {
      const response1 = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room1");
      const data1 = await response1.json();

      const response2 = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room2");
      const data2 = await response2.json();

      const response3 = await fetch("https://sheetdb.io/api/v1/26ca60uj6plvv?sheet=room3");
      const data3 = await response3.json();

      const gridData = [...data1, ...data2, ...data3];
      const itemInGrid = gridData.some(row => Object.values(row).some(cell => cell.includes(item.ID)));
      const shelfContainerInGrid = item.ShelfContainer ? gridData.some(row => Object.values(row).some(cell => cell.includes(item.ShelfContainer))) : false;

      if (itemInGrid) {
        setItemExistsInGrid(true);
        setHighlightID(item.ID);
      } else if (shelfContainerInGrid) {
        setItemExistsInGrid(true);
        setHighlightID(item.ShelfContainer);
      } else {
        setItemExistsInGrid(false);
        setHighlightID(null);
      }
    } catch (error) {
      console.error("Error checking item in grid:", error);
    }
  };

  const onDetected = (data) => {
    const code = data.codeResult.code;
    console.log("Detected code:", code);
    setFlash(true);
    setTimeout(() => setFlash(false), 100);

    setFormData((prevFormData) => ({
      ...prevFormData,
      ID: code
    }));

    fetchDataForID(code);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    submitFormData(formData);
  };

  const submitFormData = async (data) => {
    const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    const dataToSend = {
      ID: data.ID,
      Campus: data.Campus,
      Department: data.Department,
      Room: data.Room,
      ShelfContainer: data.ShelfContainer,
      Date: currentDate
    };

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
    try {
      const response = await fetch(
        `https://sheetdb.io/api/v1/26ca60uj6plvv/ID/${dataToSend.ID}?sheet=Inventory`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            GridLocation: dataToSend.GridLocation,
            "Last updated": dataToSend.Date
          })
        }
      );
      const data = await response.json();
      console.log(`Response for updating ID ${dataToSend.ID}:`, data);
    } catch (error) {
      console.error(`Error updating the Inventory sheet for ID ${dataToSend.ID}:`, error);
    }
  };

  const renderOptions = (options) => {
    return options.map((option, index) => (
      <option key={index} value={option}>{option}</option>
    ));
  };

  const handleItemClick = (id) => {
    prevID.current = formData.ID;
    setFormData({ ...formData, ID: id });
    fetchDataForID(id);
  };

  const handleImageClick = (url) => {
    setFullscreenImage(url);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setFullscreenImage(null);
  };

  const handleShowInGrid = () => {
    if (highlightID) {
      setHighlightItem(highlightID);
      navigate('/grid');
    } else {
      alert("Item not found in grid");
    }
  };

  return (
    <Box className="ViewPage" textAlign="center">
      {isFullscreen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          width="100vw"
          height="100vh"
          bg="rgba(0, 0, 0, 0.8)"
          display="flex"
          justifyContent="center"
          alignItems="center"
          zIndex="1000"
        >
          <Image src={fullscreenImage} alt="Fullscreen Item Image" maxH="90%" maxW="90%" objectFit="contain" />
          <CloseButton
            position="absolute"
            top="20px"
            right="20px"
            color="white"
            size="lg"
            onClick={closeFullscreen}
          />
        </Box>
      )}
      {prevID.current && (
        <Button
          position="fixed"
          top="10px"
          left="10px"
          zIndex="10"
          onClick={() => {
            handleItemClick(prevID.current);
            prevID.current = null;
          }}
          boxShadow="md"
        >
          Back to {prevID.current}
        </Button>
      )}
      <Heading>View Item</Heading>
      <Box as="form" className="form" onSubmit={handleSubmit}>
        <FormControl>
          <FormLabel>ID</FormLabel>
          <Select name="ID" value={formData.ID} onChange={handleChange}>
            <option value="">Select ID</option>
            {renderOptions(ids)}
          </Select>
        </FormControl>
        <Button colorScheme="teal" mt={4} onClick={startScanner}>Start Scanning</Button>
        <Box id="interactive" className={`viewport ${flash ? "flash" : ""}`} mt={4} />
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
        {formData.ImageURL !== "No Image" ? (
          <Box mt={4} maxWidth="500px" maxHeight="500px" onClick={() => handleImageClick(formData.ImageURL)}>
            <Image src={formData.ImageURL} alt="Item Image" boxSize="100%" objectFit="contain" />
          </Box>
        ) : (
          <Text mt={4}>No Image</Text>
        )}
        <Text mt={4}><strong>Description:</strong> {formData.Description}</Text>
        <Button type="submit" colorScheme="teal" mt={4}>Submit</Button>
      </Box>
      <Button
        colorScheme="teal"
        mt={4}
        onClick={handleShowInGrid}
        isDisabled={!itemExistsInGrid}
      >
        Show in Grid
      </Button>
      {containsItems.length > 0 && (
        <Box mt={8}>
          <Heading size="md">Contains:</Heading>
          <SimpleGrid columns={[1, 2, 3]} spacing={4}>
            {containsItems.map(item => (
              <Box key={item.ID} p={4} borderWidth="1px" borderRadius="md">
                <VStack align="start">
                  <Text><strong>ID:</strong> <Button variant="link" onClick={() => handleItemClick(item.ID)}>{item.ID}</Button></Text>
                  <Text><strong>Item:</strong> {item.Item}</Text>
                  <Text><strong>Description:</strong> {item.Description}</Text>
                  {item.ImageURL ? (
                    <Image src={item.ImageURL} alt="Item Image" boxSize="100%" objectFit="contain" onClick={() => handleImageClick(item.ImageURL)} />
                  ) : (
                    <Text>No Image</Text>
                  )}
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
}
