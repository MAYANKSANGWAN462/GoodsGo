import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import PropTypes from 'prop-types';
import Modal from './Modal';
import Button from './Button';
import { getCroppedImg } from '../../utils/cropImage';

export default function AvatarCropModal({ imageSrc, onClose, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } catch {
      setIsProcessing(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Adjust photo"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} isLoading={isProcessing}>
            Use this photo
          </Button>
        </>
      }
    >
      {/* Cropper canvas — fixed height so the modal doesn't grow with image size */}
      <div className="relative h-72 sm:h-96 bg-black rounded-lg overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Zoom slider */}
      <div className="mt-5 px-1">
        <p className="text-xs text-text-muted text-center mb-2">
          Drag to reposition &middot; scroll or use the slider to zoom
        </p>
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
          </svg>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary cursor-pointer"
            aria-label="Zoom"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
          </svg>
        </div>
      </div>
    </Modal>
  );
}

AvatarCropModal.propTypes = {
  imageSrc: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
