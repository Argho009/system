import React, { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export const TimetableCropper = ({ onCropComplete, onCancel }) => {
  const [upImg, setUpImg] = useState();
  const imgRef = useRef(null);
  const [crop, setCrop] = useState({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
  const [completedCrop, setCompletedCrop] = useState(null);

  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const onSelectFile = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (file.type === 'application/pdf') {
        setIsProcessingPdf(true);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          
          const viewport = page.getViewport({ scale: 2.5 }); // High scale for clear crop
          const canvas = document.createElement('canvas');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const context = canvas.getContext('2d');
          
          await page.render({ canvasContext: context, viewport }).promise;
          setUpImg(canvas.toDataURL('image/png'));
        } catch (err) {
          console.error(err);
          toast.error('Could not process PDF. Make sure it is valid.');
        } finally {
          setIsProcessingPdf(false);
        }
      } else {
        const reader = new FileReader();
        reader.addEventListener('load', () => setUpImg(reader.result));
        reader.readAsDataURL(file);
      }
    }
  };

  const onLoad = (e) => { imgRef.current = e.currentTarget; };

  const generateCroppedImage = async () => {
    if (!completedCrop || !imgRef.current) return;
    const image = imgRef.current;
    if (!completedCrop.width || !completedCrop.height) {
        onCancel();
        return;
    }
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      onCropComplete(blob);
    }, 'image/png');
  };

  return (
    <div className="flex flex-col gap-4">
      {!upImg && (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
          <input type="file" accept="image/*,.pdf" onChange={onSelectFile} disabled={isProcessingPdf} className="mb-4 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          <p className="text-sm text-slate-500 font-medium">
            {isProcessingPdf ? 'Extracting PDF page...' : 'Upload Image or PDF of the timetable'}
          </p>
        </div>
      )}
      {upImg && (
        <div className="flex flex-col gap-4">
          <div className="max-h-[60vh] max-w-full overflow-auto border border-slate-200">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
            >
              <img src={upImg} onLoad={onLoad} alt="Timetable to crop" style={{maxWidth: '100%'}}/>
            </ReactCrop>
          </div>
          <div className="flex justify-end gap-2 mt-4">
             <Button variant="ghost" onClick={onCancel}>Cancel</Button>
             <Button onClick={generateCroppedImage}>Crop & Save Image</Button>
          </div>
        </div>
      )}
    </div>
  );
};
