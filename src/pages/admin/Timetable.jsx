import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { TimetableCropper } from '../../components/timetable/TimetableCropper';
import { PDFImportModal } from '../../components/timetable/PDFImportModal';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Calendar, Filter, Image as ImageIcon, Trash2, FileDown, RefreshCcw, Layers } from 'lucide-react';
import { toast } from '../../components/ui/Toast';

export const AdminTimetable = () => {
    const [branch, setBranch] = useState('');
    const [sem, setSem] = useState('1');
    const [branches, setBranches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [showCropper, setShowCropper] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [customImage, setCustomImage] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [bList, sList] = await Promise.all([api.getBranches(), api.getSubjects()]);
                setBranches(bList || []);
                if (bList?.length > 0) setBranch(bList[0].name);
                setSubjects(sList || []);
            } catch {
                toast.error('Failed to load branches or subjects');
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!branch || !sem) return;
        const fetchImage = async () => {
            try {
                const data = await api.getSystemConfigKey(`timetable_img_${branch}_${sem}`);
                if (data?.value) setCustomImage(data.value);
                else setCustomImage(null);
            } catch {
                setCustomImage(null);
            }
        };
        fetchImage();
    }, [branch, sem]);

    const handleCropComplete = async (blob) => {
        setUploading(true);
        try {
            const fileName = `timetable_${branch}_${sem}_${Date.now()}.png`;
            const fd = new FormData();
            fd.append('file', new File([blob], fileName, { type: 'image/png' }));
            fd.append('folder', 'timetables');
            const { url: imgUrl } = await api.uploadFile(fd);

            await api.putSystemConfig({
                key: `timetable_img_${branch}_${sem}`,
                value: imgUrl,
            });

            setCustomImage(imgUrl);
            setShowCropper(false);
            toast.success('Timetable image updated');
        } catch (error) {
            toast.error(error?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveImage = async () => {
        if (!window.confirm('Remove readymade image and return to grid editor?')) return;
        try {
            await api.deleteSystemConfigKey(`timetable_img_${branch}_${sem}`);
            setCustomImage(null);
            toast.success('Custom image removed');
        } catch {
            toast.error('Could not remove image config');
        }
    };

    const handleClearSchedule = async () => {
        if (!window.confirm(`WARNING: This will permanently delete the entire schedule for ${branch} Semester ${sem}. Continue?`)) return;
        try {
            await api.clearTimetable(branch, parseInt(sem));
            setRefreshKey(prev => prev + 1);
            toast.success('Schedule cleared successfully');
        } catch (e) {
            toast.error('Failed to clear schedule');
        }
    };
    
    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-2xl shadow-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Layers className="w-32 h-32 text-indigo-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                            <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                            Timetable <span className="text-indigo-600">Architect</span>
                        </h2>
                    </div>
                    <p className="text-slate-400 font-medium max-w-md leading-relaxed">
                        Design and deploy master schedules across all branches. Use PDF automation or manual grid fine-tuning.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 relative z-10">
                    <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setShowPDFModal(true)}>
                        <FileDown className="h-4 w-4 mr-2" />
                        PDF Import
                    </Button>
                    <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setShowCropper(true)}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Upload Readymade
                    </Button>
                    <Button className="rounded-xl shadow-xl shadow-indigo-200" onClick={() => setRefreshKey(k => k + 1)}>
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>
            
            {/* Filter and Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white/60 backdrop-blur-xl p-3 border border-slate-200/60 rounded-2xl shadow-sm flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2 pl-3">
                        <Filter className="h-4 w-4 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Segment</span>
                    </div>
                    
                    <div className="h-8 w-px bg-slate-100 hidden md:block" />

                    <div className="flex items-center gap-3">
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-slate-300 uppercase block pl-1">Branch</label>
                            <select 
                                className="bg-transparent border-0 text-sm font-black text-slate-700 focus:ring-0 cursor-pointer p-0 pr-8"
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                            >
                                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="space-y-0.5 ml-4">
                            <label className="text-[10px] font-bold text-slate-300 uppercase block pl-1">Semester</label>
                            <select 
                                className="bg-transparent border-0 text-sm font-black text-slate-700 focus:ring-0 cursor-pointer p-0 pr-8"
                                value={sem}
                                onChange={(e) => setSem(e.target.value)}
                            >
                                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 flex items-center justify-end gap-3">
                    <Button 
                        variant="ghost" 
                        className="text-red-500 hover:bg-red-50 rounded-xl"
                        onClick={handleClearSchedule}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reset Semester
                    </Button>
                </div>
            </div>
            
            {/* Main Area */}
            <div className="animate-in fade-in zoom-in-95 duration-700">
                {customImage ? (
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl text-center space-y-6">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
                             <div className="text-left">
                                <h3 className="font-black text-slate-900 leading-tight">Readymade View Active</h3>
                                <p className="text-xs text-slate-400 font-medium">Grid editor is disabled while custom image is active.</p>
                             </div>
                             <Button variant="danger" size="sm" className="rounded-xl" onClick={handleRemoveImage}>
                                <Trash2 className="h-4 w-4 mr-2" /> Disable Image
                             </Button>
                        </div>
                        <img src={customImage} alt="Timetable" className="max-w-full rounded-2xl shadow-2xl mx-auto ring-8 ring-slate-50" />
                    </div>
                ) : (
                    <div className="bg-slate-50 p-1 rounded-[2.5rem] shadow-inner shadow-slate-200/50 overflow-hidden">
                        <div className="p-4 bg-white/40 backdrop-blur-sm rounded-[2.25rem]">
                            <TimetableGrid 
                                key={`${branch}-${sem}-${refreshKey}`} 
                                branch={branch} 
                                sem={parseInt(sem)} 
                                editable={true} 
                            />
                        </div>
                    </div>
                )}
            </div>

            <Modal isOpen={showCropper} onClose={() => setShowCropper(false)} title="Readymade Timetable Engine">
                <div className="p-6 bg-white space-y-4">
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-4">
                        <div className="bg-white p-2.5 rounded-xl shadow-sm h-fit">
                            <ImageIcon className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <h4 className="font-black text-indigo-900 text-sm">Visual Mode</h4>
                            <p className="text-xs text-indigo-600/80 leading-relaxed">
                                Upload an image and crop it to the exact bounds for <strong>{branch} - Sem {sem}</strong>. 
                                This replaces the grid for all users.
                            </p>
                        </div>
                    </div>
                    {uploading ? (
                        <div className="p-20 text-center space-y-4">
                             <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
                             <p className="text-slate-400 text-sm font-medium">Baking your image...</p>
                        </div>
                    ) : (
                        <TimetableCropper onCropComplete={handleCropComplete} onCancel={() => setShowCropper(false)} />
                    )}
                </div>
            </Modal>

            <PDFImportModal 
                isOpen={showPDFModal} 
                onClose={() => setShowPDFModal(false)}
                onSaved={() => setRefreshKey(k => k + 1)}
                branches={branches}
                sems={[1,2,3,4,5,6,7,8]}
                subjects={subjects}
            />
        </div>
    );
};
