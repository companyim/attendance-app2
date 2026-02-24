import React, { useState, useRef, DragEvent } from 'react';
import api from '../../services/api';
import Button from '../common/Button';

interface SheetInfo {
  index: number;
  name: string;
  headers: string[];
  sampleRows: string[][];
  rowCount: number;
  suggestedMapping?: Record<string, number>;
}

type FieldKey = 'name' | 'baptismName' | 'grade' | 'department' | 'phone';

const FIELD_LABELS: Record<FieldKey, { label: string; required: boolean }> = {
  name: { label: '이름', required: true },
  baptismName: { label: '세례명', required: false },
  grade: { label: '학년', required: true },
  department: { label: '부서', required: false },
  phone: { label: '전화번호', required: false },
};

type Step = 'select' | 'mapping' | 'result';

export default function ExcelUpload({ onSuccess }: { onSuccess?: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [mapping, setMapping] = useState<Record<FieldKey, number>>({
    name: 0, baptismName: 0, grade: 0, department: 0, phone: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
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
      const ext = droppedFile.name.substring(droppedFile.name.lastIndexOf('.')).toLowerCase();
      if (['.xlsx', '.xls'].includes(ext)) {
        setFile(droppedFile);
        setError('');
        setResult(null);
      } else {
        setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      }
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/students/upload-excel/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const sheetsData: SheetInfo[] = response.data.sheets;
      setSheets(sheetsData);
      setSelectedSheet(0);
      const suggested = sheetsData[0]?.suggestedMapping;
      setMapping({
        name: suggested?.name || 0,
        baptismName: suggested?.baptismName || 0,
        grade: suggested?.grade || 0,
        department: suggested?.department || 0,
        phone: suggested?.phone || 0,
      });
      setStep('mapping');
    } catch (err: any) {
      setError(err?.userMessage || err.response?.data?.error || '파일을 읽는 중 오류가 발생했습니다.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!mapping.name || !mapping.grade) {
      setError('이름과 학년은 필수로 매핑해야 합니다.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetIndex', String(selectedSheet));
      formData.append('headerRow', '1');
      formData.append('mapping', JSON.stringify(mapping));
      const response = await api.post('/students/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
      setStep('result');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.userMessage || err.response?.data?.error || '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setStep('select');
    setFile(null);
    setSheets([]);
    setResult(null);
    setError('');
    setMapping({ name: 0, baptismName: 0, grade: 0, department: 0, phone: 0 });
  };

  const openFileDialog = () => fileInputRef.current?.click();

  const currentSheet = sheets[selectedSheet];

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>엑셀 업로드</Button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleClose} />
          <div className="relative bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 z-[10000] max-h-[90vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <h2 className="text-xl font-semibold">
                {step === 'select' && '학생 목록 엑셀 업로드'}
                {step === 'mapping' && '열 매핑 설정'}
                {step === 'result' && '업로드 결과'}
              </h2>
              <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* 바디 */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">

              {/* Step 1: 파일 선택 */}
              {step === 'select' && (
                <>
                  <div>
                    <label className="block mb-2 font-medium">엑셀 파일 선택</label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={openFileDialog}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors relative ${
                        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                      }`}
                    >
                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" style={{ zIndex: 10002 }} />
                      <div className="pointer-events-none">
                        <div className="text-4xl mb-2">📁</div>
                        <p className="text-gray-600 font-medium">클릭하거나 파일을 여기에 드래그하세요</p>
                        <p className="text-sm text-gray-400 mt-1">.xlsx, .xls 파일만 가능</p>
                      </div>
                    </div>
                    {file && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg flex items-center gap-2">
                        <span className="text-green-600">✅</span>
                        <span className="text-green-700 font-medium">{file.name}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                          className="ml-auto text-gray-400 hover:text-red-500">✕</button>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    <p className="font-medium mb-1">사용 방법:</p>
                    <p className="text-gray-600">파일을 선택하면 시트와 열 정보를 미리 확인하고,<br />이름·세례명·학년·부서 등을 원하는 열에 매핑할 수 있습니다.</p>
                  </div>
                </>
              )}

              {/* Step 2: 매핑 설정 */}
              {step === 'mapping' && currentSheet && (
                <>
                  {/* 시트 선택 */}
                  {sheets.length > 1 && (
                    <div>
                      <label className="block mb-1 font-medium text-sm">시트 선택</label>
                      <div className="flex flex-wrap gap-2">
                        {sheets.map((s) => (
                          <button key={s.index} type="button"
                            onClick={() => {
                              setSelectedSheet(s.index);
                              const sm = s.suggestedMapping;
                              setMapping({
                                name: sm?.name || 0,
                                baptismName: sm?.baptismName || 0,
                                grade: sm?.grade || 0,
                                department: sm?.department || 0,
                                phone: sm?.phone || 0,
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedSheet === s.index
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 열 매핑 */}
                  <div>
                    <label className="block mb-2 font-medium text-sm">열 매핑</label>
                    <div className="space-y-2">
                      {(Object.keys(FIELD_LABELS) as FieldKey[]).map((field) => (
                        <div key={field} className="flex items-center gap-3">
                          <span className={`w-20 text-sm ${FIELD_LABELS[field].required ? 'font-semibold' : 'text-gray-600'}`}>
                            {FIELD_LABELS[field].label}
                            {FIELD_LABELS[field].required && <span className="text-red-500 ml-0.5">*</span>}
                          </span>
                          <select
                            value={mapping[field]}
                            onChange={(e) => setMapping(prev => ({ ...prev, [field]: parseInt(e.target.value, 10) }))}
                            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value={0}>-- 선택 안함 --</option>
                            {currentSheet.headers.map((h, i) => (
                              <option key={i} value={i + 1}>{h}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      이름에 세례명이 함께 있으면 (예: 손유림 루치아) 세례명을 선택 안함으로 두면 자동 분리됩니다.
                    </p>
                    {mapping.name > 0 && mapping.grade > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                        자동으로 열이 감지되었습니다. 확인 후 바로 업로드하세요.
                      </div>
                    )}
                  </div>

                  {/* 미리보기 테이블 */}
                  <div>
                    <label className="block mb-1 font-medium text-sm">데이터 미리보기</label>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            {currentSheet.headers.map((h, i) => {
                              const mappedField = (Object.keys(mapping) as FieldKey[]).find(f => mapping[f] === i + 1);
                              return (
                                <th key={i} className={`px-2 py-1.5 text-left whitespace-nowrap border-b ${
                                  mappedField ? 'bg-blue-50 text-blue-700' : 'text-gray-500'
                                }`}>
                                  {mappedField && <span className="block text-[10px] text-blue-500">{FIELD_LABELS[mappedField].label}</span>}
                                  {h}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {currentSheet.sampleRows.map((row, ri) => (
                            <tr key={ri} className="border-b last:border-b-0">
                              {row.map((cell, ci) => {
                                const mappedField = (Object.keys(mapping) as FieldKey[]).find(f => mapping[f] === ci + 1);
                                return (
                                  <td key={ci} className={`px-2 py-1 whitespace-nowrap ${mappedField ? 'bg-blue-50/50' : ''}`}>
                                    {cell}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">총 {currentSheet.rowCount - 1}개 행 (헤더 제외)</p>
                  </div>
                </>
              )}

              {/* Step 3: 결과 */}
              {step === 'result' && result && (
                <div className="space-y-3">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-green-800 font-semibold text-lg">{result.message}</p>
                    <div className="flex justify-center gap-6 mt-3 text-sm">
                      <span className="text-green-700">등록: {result.created}명</span>
                      <span className="text-yellow-700">건너뜀: {result.skipped}명</span>
                      <span className="text-red-700">오류: {result.errors}개</span>
                    </div>
                  </div>
                  {result.details?.errors?.length > 0 && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      <p className="font-medium mb-1">오류 목록:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {result.details.errors.slice(0, 10).map((err: string, idx: number) => (
                          <li key={idx}>{err}</li>
                        ))}
                        {result.details.errors.length > 10 && (
                          <li>... 외 {result.details.errors.length - 10}개</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {error && <div className="text-red-600 text-sm">{error}</div>}
            </div>

            {/* 푸터 */}
            <div className="flex gap-2 justify-end p-4 border-t shrink-0">
              {step === 'select' && (
                <>
                  <Button variant="secondary" onClick={handleClose}>닫기</Button>
                  <Button onClick={handlePreview} isLoading={previewing} disabled={!file}>다음</Button>
                </>
              )}
              {step === 'mapping' && (
                <>
                  <Button variant="secondary" onClick={() => setStep('select')}>이전</Button>
                  <Button onClick={handleUpload} isLoading={uploading}
                    disabled={!mapping.name || !mapping.grade}>업로드</Button>
                </>
              )}
              {step === 'result' && (
                <Button onClick={handleClose}>완료</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
