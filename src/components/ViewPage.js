import React, { useState, useEffect } from 'react';
import Quagga from '@ericblade/quagga2';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  Heading,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton
} from '@chakra-ui/react';

export default function ViewPage() {
  const [formData, setFormData] = useState({
    ID: "",
    Campus: "",
    Department: "",
    Room: "",
    ShelfContainer: "",
    ImageURL: "",
    Description: "",
    containsItems: []
  });
  const [flash, setFlash] = useState(false);
  const [ids, setIds] = useState([]);
  const [shelfContainerOptions, setShelfContainerOptions] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [insidersSet, setInsidersSet] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [previousID, setPreviousID] = useState(null);

  useEffect(() => {
    fetchDropdownData();
    return () => {
      Quagga.offDetected(onDetected);
      Quagga.stop();
      if (Quagga.cameraAccess) {
        Quagga.CameraAccess.release();
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
      setInsidersSet(insidersSet);
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
      setPreviousID(null); // Clear previous ID if manually changing ID
      await fetchDataForID(value);
    }
  };

  const fetchDataForID = async (id) => {
    try {
      const response = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv/search?ID=${id}&sheet=Inventory`);
      const data = await response.json();
      if (data.length > 0) {
        const item = data[0];
        const containsItems = [];
        if (insidersSet.has(item.Item)) {
          const responseContains = await fetch(`https://sheetdb.io/api/v1/26ca60uj6plvv/search?ShelfContainer=${id}&sheet=Inventory`);
          const dataContains = await responseContains.json();
          containsItems.push(...dataContains);
        }
        setFormData((prevFormData) => ({
          ...prevFormData,
          Campus: item.Campus,
          Department: item.Department,
          Room: item.Room,
          ShelfContainer: item.ShelfContainer,
          ImageURL: item.ImageURL || "No Image",
          Description: item.Description || "No Description",
          containsItems
        }));
      }
    } catch (error) {
      console.error(`Error fetching data for ID ${id}:`, error);
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
          facingMode: "environment"
        },
        area: {
          top: "0%",
          right: "0%",
          left: "0%",
          bottom: "0%"
        },
        target: document.querySelector('#interactive'),
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
    const currentDate = new Date().toISOString().split('T')[0];

    const dataToSend = {
      ID: data.ID,
      Campus: data.Campus,
      Department: data.Department,
      Room: data.Room,
      ShelfContainer: data.ShelfContainer,
      Date: currentDate
    };

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

    try {
      const response = await fetch(
        `https://sheetdb.io/api/v1/26ca60uj6plvv/ID/${dataToSend.ID}?sheet=Inventory`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            Campus: dataToSend.Campus,
            Department: dataToSend.Department,
            Room: dataToSend.Room,
            ShelfContainer: dataToSend.ShelfContainer,
            "Last updated": currentDate
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

  const openModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage("");
  };

  const handleItemClick = (id) => {
    setPreviousID(formData.ID); // Save the current ID before changing
    setFormData((prevFormData) => ({
      ...prevFormData,
      ID: id
    }));
    fetchDataForID(id);
  };

  const handleBackClick = () => {
    if (previousID) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        ID: previousID
      }));
      fetchDataForID(previousID);
      setPreviousID(null);
    }
  };

  return (
    <Box className="ViewPage" textAlign="center">
      <Heading>View Item</Heading>
      {previousID && (
        <Button
          colorScheme="teal"
          position="fixed"
          top="10px"
          left="10px"
          zIndex="1000"
          boxShadow="md"
          onClick={handleBackClick}
        >
          Back to {previousID}
        </Button>
      )}
      <Box as="form" className="form" onSubmit={handleSubmit}>
        <FormControl>
          <FormLabel>ID</FormLabel>
          <Select name="ID" value={formData.ID} onChange={handleChange}>
            <option value="">Select ID</option>
            {renderOptions(ids)}
          </Select>
        </FormControl>
        <Button colorScheme="teal" mt={4} onClick={startScanner}>Scan Barcode</Button>
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
        {formData.ImageURL && (
          <Box mt={4} maxWidth="500px" maxHeight="500px" borderWidth="1px" borderRadius="lg" overflow="hidden" display="flex" alignItems="center" justifyContent="center">
            {formData.ImageURL === "No Image" ? (
              <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
                No Image
              </Box>
            ) : (
              <Image src={formData.ImageURL} alt="Item Image" boxSize="100%" objectFit="contain" onClick={() => openModal(formData.ImageURL)} cursor="pointer" />
            )}
          </Box>
        )}
        <Box mt={2} p={4} borderWidth="1px" borderRadius="lg" width="500px">
          <Heading size="sm">Description:</Heading>
          <p>{formData.Description || "No Description"}</p>
        </Box>
        {formData.containsItems.length > 0 && (
          <Box mt={4} p={4} borderWidth="1px" borderRadius="lg" width="100%">
            <Heading size="md">Contains:</Heading>
            <Box display="flex" flexWrap="wrap" justifyContent="center">
              {formData.containsItems.map((item, index) => (
                <Box key={index} m={2} p={2} borderWidth="1px" borderRadius="lg" width="45%" display="flex" flexDirection="column" alignItems="center" onClick={() => handleItemClick(item.ID)} cursor="pointer">
                  <Heading size="sm">ID: {item.ID}</Heading>
                  <Box mt={1}><strong>Item:</strong> {item.Item}</Box>
                  <Box mt={2} maxWidth="200px" maxHeight="200px" borderWidth="1px" borderRadius="lg" overflow="hidden" display="flex" alignItems="center" justifyContent="center">
                    {item.ImageURL === "No Image" ? (
                      <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
                        No Image
                      </Box>
                    ) : (
                      <Image src={item.ImageURL} alt="Item Image" boxSize="100%" objectFit="contain" onClick={(e) => { e.stopPropagation(); openModal(item.ImageURL); }} cursor="pointer" />
                    )}
                  </Box>
                  <Box mt={2}>
                    <Heading size="sm">Description:</Heading>
                    <p>{item.Description || "No Description"}</p>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        <Button type="submit" colorScheme="teal" mt={4}>Submit</Button>
      </Box>

      <Modal isOpen={isModalOpen} onClose={closeModal} size="full">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody display="flex" justifyContent="center" alignItems="center">
            <Box width="40%" height="40%" display="flex" justifyContent="center" alignItems="center" position="relative">
              <Image src={selectedImage} alt="Full Screen Image" width="100%" height="100%" objectFit="contain" />
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
