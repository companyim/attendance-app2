import React, { useState, useRef, DragEvent } from 'react';
import api from '../../services/api';
import Button from '../common/Button';

export default function ExcelUpload({ onSuccess }: { onSuccess?: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = droppedFile.name.substring(droppedFile.name.lastIndexOf('.'));
      if (validExtensions.includes(fileExtension.toLowerCase())) {
        setFile(droppedFile);
        setError('');
        setResult(null);
      } else {
        setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }

    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension.toLowerCase())) {
      setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/students/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setFile(null);
    setResult(null);
    setError('');
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>엑셀 업로드</Button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleClose}
          />
          
          {/* 모달 컨텐츠 */}
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 z-[10000]">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">학생 목록 엑셀 업로드</h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            {/* 바디 */}
            <div className="p-4 space-y-4">
              {/* 드래그 앤 드롭 영역 */}
              <div>
                <label className="block mb-2 font-medium">엑셀 파일 선택</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={openFileDialog}
                  className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                    transition-colors relative
                    ${isDragging 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                    }
                  `}
                  style={{ position: 'relative', zIndex: 10001 }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ zIndex: 10002 }}
                  />
                  <div className="pointer-events-none">
                    <div className="text-4xl mb-2">📁</div>
                    <p className="text-gray-600 font-medium">
                      클릭하거나 파일을 여기에 드래그하세요
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      .xlsx, .xls 파일만 가능
                    </p>
                  </div>
                </div>
                
                {file && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-green-700 font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="ml-auto text-gray-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-2">엑셀 파일 형식:</p>
                <p className="text-gray-700">
                  필수: 이름, 학년<br />
                  선택: 세례명, 부서, 학번, 이메일, 전화번호
                </p>
                <p className="text-gray-600 mt-2">
                  학년: 유치부, 1학년, 2학년, 첫영성체, 4학년, 5학년, 6학년
                </p>
              </div>

              {error && <div className="text-red-600">{error}</div>}

              {result && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-green-800 font-medium">{result.message}</p>
                  {result.details?.errors && result.details.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      <p className="font-medium">오류:</p>
                      <ul className="list-disc list-inside">
                        {result.details.errors.slice(0, 10).map((err: string, idx: number) => (
                          <li key={idx}>{err}</li>
                        ))}
                        {result.details.errors.length > 10 && (
                          <li>... 외 {result.details.errors.length - 10}개 오류</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={handleClose} disabled={uploading}>
                  닫기
                </Button>
                <Button type="button" onClick={handleUpload} isLoading={uploading} disabled={!file}>
                  업로드
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
