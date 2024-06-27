import React, { useEffect, useRef } from 'react';
import Quagga from '@ericblade/quagga2';
import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton
} from '@chakra-ui/react';

export default function PopupScanner({ isOpen, onClose, onDetected }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    }

    return () => {
      if (isOpen) {
        Quagga.stop();
      }
      Quagga.offDetected(handleDetected);
      if (Quagga.CameraAccess) {
        Quagga.CameraAccess.release();
      }
    };
  }, [isOpen]);

  const startScanner = () => {
    if (scannerRef.current) {
      Quagga.init({
        inputStream: {
          type: "LiveStream",
          constraints: {
            facingMode: "environment"
          },
          target: scannerRef.current,
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

      Quagga.onDetected(handleDetected);
    }
  };

  const handleDetected = (data) => {
    const code = data.codeResult.code;
    onDetected(code);
    Quagga.stop();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Scan Barcode</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box id="scanner-popup" ref={scannerRef} width="100%" height="400px" />
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
