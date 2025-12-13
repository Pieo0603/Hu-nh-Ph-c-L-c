import React, { useState, useMemo, useEffect } from 'react';
import { Message, ThemeConfig, VocabItem, StudyLog } from '../types';
import { X, Trash2, CheckSquare, Square, Search, Download, Filter, LogOut, Wrench, Lock, Lightbulb, Upload, FileText, Database, PlusCircle, Wand2, Info, BookOpen, RefreshCw, Clock, CheckCircle, AlertCircle, Key, RefreshCcw } from 'lucide-react';
import { db } from '../services/firebase';

interface AdminDashboardProps {
  messages: Message[];
  onDeleteMessages: (ids: string[]) => void;
  onClose: () => void;
  theme: ThemeConfig;
}

type AdminTab = 'messages' | 'upload' | 'vocab' | 'study_logs' | 'settings';

// DỮ LIỆU MẪU (Giữ nguyên cấu trúc, chỉ sửa nội dung hiển thị nếu cần)
const SAMPLE_VOCAB = [
  { word: "calculator", type: "n", pronunciation: "/ˈkælkjuleɪtə(r)/", meaning: "máy tính, công cụ tính", level: "A2", synonyms: "", antonyms: "" },
  { word: "carbon footprint", type: "n", pronunciation: "/ˈkɑːbən ˈfʊtprɪnt/", meaning: "tổng lượng khí thải carbon", level: "B2", synonyms: "", antonyms: "" },
  { word: "detailed", type: "adj", pronunciation: "/ˈdiːteɪld/", meaning: "chi tiết", level: "B2", synonyms: "specific", antonyms: "general" }
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ messages, onDeleteMessages, onClose, theme }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('messages');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Trạng thái quản lý từ vựng
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [selectedVocabIds, setSelectedVocabIds] = useState<Set<string>>(new Set());
  const [vocabLoading, setVocabLoading] = useState(false);
  const [vocabFilterTopic, setVocabFilterTopic] = useState('all');

  // Trạng thái quản lý nhật ký học
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const [logsLoading, setLogsLoading] = useState(false);

  // Trạng thái Settings (Mã truy cập)
  const [accessCode, setAccessCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);

  // Trạng thái Upload
  const [rawText, setRawText] = useState('');
  const [targetTopicId, setTargetTopicId] = useState('topic_1');
  const [isProcessing, setIsProcessing] = useState(false);

  // Trạng thái Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'messages' | 'vocab' | 'study_logs'>('messages');

  // --- LOGIC TẢI DỮ LIỆU ---
  const fetchVocab = async () => {
    setVocabLoading(true);
    try {
        let q;
        if (vocabFilterTopic === 'all') {
            q = db.collection("vocabulary");
        } else {
            q = db.collection("vocabulary").where("topicId", "==", vocabFilterTopic);
        }
        const snapshot = await q.get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VocabItem));
        setVocabList(data);
        setSelectedVocabIds(new Set()); // Reset chọn khi lọc lại
    } catch (error) {
        console.error("Lỗi tải từ vựng:", error);
    } finally {
        setVocabLoading(false);
    }
  };

  const fetchStudyLogs = async () => {
      setLogsLoading(true);
      try {
          // Lấy 100 log mới nhất
          const snapshot = await db.collection("study_logs").orderBy("timestamp", "desc").limit(100).get();
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyLog));
          setStudyLogs(data);
          setSelectedLogIds(new Set());
      } catch (error) {
          console.error("Lỗi tải nhật ký:", error);
      } finally {
          setLogsLoading(false);
      }
  };

  const fetchAccessCode = async () => {
      setLoadingCode(true);
      try {
          const doc = await db.collection("settings").doc("global_config").get();
          if (doc.exists) {
              setAccessCode(doc.data()?.accessCode || "Chưa thiết lập");
          } else {
              setAccessCode("Chưa thiết lập");
          }
      } catch (error) {
          console.error("Lỗi tải mã:", error);
      } finally {
          setLoadingCode(false);
      }
  };

  useEffect(() => {
    if (activeTab === 'vocab') fetchVocab();
    if (activeTab === 'study_logs') fetchStudyLogs();
    if (activeTab === 'settings') fetchAccessCode();
  }, [activeTab, vocabFilterTopic]);

  // --- LỌC VÀ SẮP XẾP TIN NHẮN ---
  const filteredMessages = useMemo(() => {
    let result = [...messages];
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (msg) =>
          msg.content.toLowerCase().includes(lowerTerm) ||
          msg.author.toLowerCase().includes(lowerTerm)
      );
    }
    result.sort((a, b) => {
      if (sortOrder === 'newest') return b.timestamp - a.timestamp;
      return a.timestamp - b.timestamp;
    });
    return result;
  }, [messages, searchTerm, sortOrder]);

  // --- HÀM XỬ LÝ (HANDLERS) ---
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const allIds = filteredMessages.map((m) => m.id);
    setSelectedIds(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Chọn từ vựng
  const toggleSelectVocab = (id: string) => {
    const newSelected = new Set(selectedVocabIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedVocabIds(newSelected);
  };

  const selectAllVocab = () => {
      if (selectedVocabIds.size === vocabList.length) {
          setSelectedVocabIds(new Set());
      } else {
          setSelectedVocabIds(new Set(vocabList.map(v => v.id)));
      }
  };

  // Chọn nhật ký học
  const toggleSelectLog = (id: string) => {
      const newSelected = new Set(selectedLogIds);
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      setSelectedLogIds(newSelected);
  };

  const selectAllLogs = () => {
      if (selectedLogIds.size === studyLogs.length) {
          setSelectedLogIds(new Set());
      } else {
          setSelectedLogIds(new Set(studyLogs.map(l => l.id)));
      }
  };

  const initiateDelete = (mode: 'messages' | 'vocab' | 'study_logs') => {
    if (mode === 'messages' && selectedIds.size === 0) return;
    if (mode === 'vocab' && selectedVocabIds.size === 0) return;
    if (mode === 'study_logs' && selectedLogIds.size === 0) return;
    
    setDeleteMode(mode);
    setIsDeleteModalOpen(true);
    setPasswordInput('');
    setPasswordError(false);
  };

  const confirmDelete = async () => {
    if (passwordInput === 'admin') {
      if (deleteMode === 'messages') {
          onDeleteMessages(Array.from(selectedIds));
          setSelectedIds(new Set());
      } else if (deleteMode === 'vocab') {
          setVocabLoading(true);
          try {
              const batch = db.batch();
              selectedVocabIds.forEach(id => {
                  batch.delete(db.collection("vocabulary").doc(id));
              });
              await batch.commit();
              alert(`Đã xóa thành công ${selectedVocabIds.size} từ vựng!`);
              fetchVocab(); 
          } catch (e) {
              console.error(e);
              alert("Lỗi khi xóa từ vựng.");
          } finally {
              setVocabLoading(false);
          }
      } else if (deleteMode === 'study_logs') {
          setLogsLoading(true);
          try {
              const batch = db.batch();
              selectedLogIds.forEach(id => {
                  batch.delete(db.collection("study_logs").doc(id));
              });
              await batch.commit();
              alert(`Đã xóa thành công ${selectedLogIds.size} bản ghi nhật ký!`);
              fetchStudyLogs();
          } catch (e) {
              console.error(e);
              alert("Lỗi khi xóa nhật ký.");
          } finally {
              setLogsLoading(false);
          }
      }
      setIsDeleteModalOpen(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "du_lieu_loi_chuc.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // --- LOGIC UPLOAD ---
  const handleProcessData = async () => {
      if (!rawText.trim()) return;
      setIsProcessing(true);

      try {
          const lines = rawText.split('\n');
          const batch = db.batch();
          let count = 0;

          for (const line of lines) {
              const cleanLine = line.trim();
              if (!cleanLine) continue;

              let word = "", type = "", pronunciation = "", meaning = "", level = "B1", synonyms = "", antonyms = "";

              if (cleanLine.includes('\t')) {
                  const parts = cleanLine.split(/\t/);
                  if (parts.length >= 2) {
                      word = parts[0]?.trim();
                      type = parts[1]?.trim();
                      pronunciation = parts[2]?.trim();
                      meaning = parts[3]?.trim();
                      level = parts[4]?.trim() || "B1";
                      synonyms = parts[5]?.trim() || "";
                      antonyms = parts[6]?.trim() || "";
                  }
              } 
              else {
                  // Logic phân tích dòng text thông thường (nếu copy không có tab)
                  const phoneticMatch = cleanLine.match(/(\/.*?\/)/);
                  if (phoneticMatch) {
                      pronunciation = phoneticMatch[0];
                      const pIndex = cleanLine.indexOf(pronunciation);
                      const partBefore = cleanLine.substring(0, pIndex).trim();
                      const lastSpaceIndex = partBefore.lastIndexOf(' ');
                      
                      if (lastSpaceIndex !== -1 && partBefore.length - lastSpaceIndex < 8) {
                          word = partBefore.substring(0, lastSpaceIndex).trim();
                          type = partBefore.substring(lastSpaceIndex + 1).trim();
                      } else {
                          word = partBefore;
                      }

                      let partAfter = cleanLine.substring(pIndex + pronunciation.length).trim();
                      const levelMatch = partAfter.match(/\s(A1|A2|B1|B2|C1|C2)$/i);
                      if (levelMatch) {
                          level = levelMatch[1].toUpperCase();
                          partAfter = partAfter.substring(0, levelMatch.index).trim();
                      }
                      meaning = partAfter;
                  }
              }

              if (word && meaning) {
                  const docRef = db.collection("vocabulary").doc();
                  batch.set(docRef, {
                      topicId: targetTopicId,
                      word,
                      type,
                      pronunciation,
                      meaning,
                      level,
                      synonyms,
                      antonyms
                  });
                  count++;
              }
          }

          if (count > 0) {
              await batch.commit();
              alert(`Thành công! Đã thêm ${count} từ vựng vào Chủ đề ${targetTopicId.split('_')[1]}.`);
              setRawText('');
          } else {
              alert("Không nhận diện được dữ liệu hợp lệ. Vui lòng kiểm tra lại định dạng.");
          }
      } catch (error) {
          console.error("Lỗi nhập liệu:", error);
          alert("Có lỗi xảy ra khi xử lý dữ liệu.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSeedData = async () => {
      if(!window.confirm(`Bạn có muốn nạp ${SAMPLE_VOCAB.length} từ vựng mẫu vào cơ sở dữ liệu không?`)) return;
      setIsProcessing(true);
      try {
          const batch = db.batch();
          SAMPLE_VOCAB.forEach(v => {
              const docRef = db.collection("vocabulary").doc();
              batch.set(docRef, { ...v, topicId: targetTopicId });
          });
          await batch.commit();
          alert(`Đã nạp xong dữ liệu mẫu!`);
      } catch (e) {
          console.error(e);
          alert("Lỗi nạp mẫu.");
      } finally {
          setIsProcessing(false);
      }
  };

  // --- LOGIC GENERATE CODE ---
  const generateNewAccessCode = async () => {
      // Logic: Random 6 ký tự viết hoa
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      if (!window.confirm(`Bạn có chắc muốn tạo mã mới? Mã cũ sẽ không còn hiệu lực.\nMã mới: ${newCode}`)) return;
      
      setLoadingCode(true);
      try {
          // Dùng set với merge: true để đảm bảo tạo document nếu chưa có
          await db.collection("settings").doc("global_config").set({ accessCode: newCode }, { merge: true });
          setAccessCode(newCode);
          alert(`Đã cập nhật mã truy cập mới: ${newCode}`);
      } catch (e) {
          console.error(e);
          alert("Lỗi khi lưu mã. Kiểm tra lại kết nối hoặc quyền hạn.");
      } finally {
          setLoadingCode(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#1a1a2e] text-white overflow-hidden flex flex-col font-sans">
      
      {/* Modal xác nhận xóa */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-[#1e1b2e] rounded-2xl border border-pink-500/20 shadow-2xl w-full max-w-md overflow-hidden transform scale-100">
              <div className="p-6 md:p-8 flex flex-col items-center text-center">
                  <div className="mb-4 text-orange-400">
                     <Lock size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-red-500 mb-2">
                      Xác nhận xóa {deleteMode === 'vocab' ? 'từ vựng' : deleteMode === 'study_logs' ? 'nhật ký học' : 'tin nhắn'}
                  </h3>
                  <div className="w-full text-left mb-6">
                    <label className="block text-xs font-semibold text-gray-400 mb-2 ml-1">Nhập mật khẩu quản trị:</label>
                    <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                      className={`w-full bg-[#2a2438] border ${passwordError ? 'border-red-500' : 'border-gray-600'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors`}
                      autoFocus
                    />
                    {passwordError && <p className="text-red-500 text-xs mt-1 ml-1">Mật khẩu không đúng!</p>}
                  </div>
                  <div className="flex gap-3 w-full">
                     <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors">Hủy bỏ</button>
                     <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg transition-colors font-bold">Xóa ngay</button>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* Thanh tiêu đề (Header) */}
      <div className="bg-[#16213e] border-b border-gray-700 px-6 py-4 flex justify-between items-center shadow-md flex-shrink-0">
        <div className="flex items-center gap-4 overflow-hidden">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 whitespace-nowrap">
                <Wrench size={24} className="text-pink-400" />
                <span className="hidden sm:inline">Trang Quản Trị</span>
                <span className="sm:hidden">Admin</span>
            </h2>
            <div className="flex bg-black/30 rounded-lg p-1 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('messages')} className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'messages' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Lời chúc</button>
                <button onClick={() => setActiveTab('vocab')} className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'vocab' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Từ vựng</button>
                <button onClick={() => setActiveTab('study_logs')} className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'study_logs' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Nhật ký</button>
                <button onClick={() => setActiveTab('upload')} className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'upload' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Nhập Excel</button>
                <button onClick={() => setActiveTab('settings')} className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Cài đặt</button>
            </div>
        </div>
        <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors whitespace-nowrap ml-2"><LogOut size={16} /> <span className="hidden sm:inline">Thoát</span></button>
      </div>

      {/* CONTENT: UPLOAD TAB */}
      {activeTab === 'upload' && (
          <div className="flex-grow overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <div className="max-w-5xl mx-auto bg-[#1f2937] p-6 rounded-2xl border border-gray-700 shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <div>
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-green-400"><Database size={20} /> Nhập dữ liệu từ Excel</h3>
                        <p className="text-gray-400 text-sm">
                            Hãy sắp xếp file Excel theo đúng thứ tự cột bên dưới, sau đó <strong>Copy (Ctrl+C)</strong> và <strong>Dán (Ctrl+V)</strong> vào ô bên dưới.
                        </p>
                      </div>
                      <button onClick={handleSeedData} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-all border border-gray-600">
                          Dùng dữ liệu mẫu
                      </button>
                  </div>
                  
                  {/* EXCEL COLUMN GUIDE */}
                  <div className="mb-6 overflow-x-auto pb-2">
                      <div className="flex min-w-max gap-1">
                          {[
                              {id: 1, name: "Từ vựng (Word)", ex: "calculator", w: "w-32"},
                              {id: 2, name: "Loại (n/v/adj)", ex: "n", w: "w-24"},
                              {id: 3, name: "Phiên âm", ex: "/.../", w: "w-32"},
                              {id: 4, name: "Nghĩa tiếng Việt", ex: "máy tính", w: "w-48"},
                              {id: 5, name: "Level", ex: "B1", w: "w-20"},
                              {id: 6, name: "Đồng nghĩa", ex: "compute", w: "w-32"},
                              {id: 7, name: "Trái nghĩa", ex: "guess", w: "w-32"},
                          ].map((col) => (
                              <div key={col.id} className={`flex flex-col bg-black/40 border border-gray-600 rounded-lg p-3 ${col.w}`}>
                                  <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Cột {col.id}</span>
                                  <span className="text-xs font-bold text-white mb-1">{col.name}</span>
                                  <span className="text-[10px] text-gray-400 italic">VD: {col.ex}</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                      <div className="flex-1">
                           <textarea 
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder={`Dán nội dung từ Excel vào đây...\nVí dụ:\ncalculator	n	/ˈkælkjuleɪtə(r)/	máy tính	A2`}
                            className="w-full h-48 bg-black/20 border border-gray-600 rounded-xl p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-green-500 whitespace-pre"
                          />
                      </div>
                      <div className="w-full md:w-64 flex flex-col gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Lưu vào chủ đề:</label>
                              <select 
                                value={targetTopicId}
                                onChange={(e) => setTargetTopicId(e.target.value)}
                                className="w-full bg-black/40 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                              >
                                  {Array.from({length: 17}, (_, i) => (
                                      <option key={i} value={`topic_${i+1}`}>Chủ đề {i+1}</option>
                                  ))}
                              </select>
                          </div>
                          <button 
                            onClick={handleProcessData}
                            disabled={isProcessing || !rawText.trim()}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold text-white shadow-lg hover:opacity-90 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isProcessing ? <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div> : <Upload size={24} />}
                              <span>Thêm vào CSDL</span>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CONTENT: SETTINGS TAB (Mã Truy Cập) */}
      {activeTab === 'settings' && (
          // Thêm flex-grow và overflow-y-auto để đảm bảo nội dung cuộn được trên màn hình nhỏ
          <div className="flex-grow overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <div className="max-w-2xl mx-auto bg-[#1f2937] p-8 rounded-2xl border border-gray-700 shadow-xl flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                      <Key size={40} className="text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Quản lý Mã Truy Cập</h3>
                  <p className="text-gray-400 text-sm mb-8 max-w-sm">
                      Mã này được sử dụng để mở khóa các bài học từ Unit 3 trở đi. Hãy chia sẻ mã này cho người dùng mà bạn muốn cấp quyền.
                  </p>

                  <div className="bg-black/30 p-6 rounded-xl border border-white/10 w-full mb-6">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Mã hiện tại</p>
                      {loadingCode ? (
                          <div className="flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div></div>
                      ) : (
                          <div className="text-4xl font-mono font-bold text-yellow-400 tracking-widest select-all break-all">
                              {accessCode}
                          </div>
                      )}
                  </div>

                  <button 
                    onClick={generateNewAccessCode}
                    disabled={loadingCode}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95"
                  >
                      <RefreshCcw size={18} className={loadingCode ? "animate-spin" : ""} />
                      Tạo mã ngẫu nhiên mới
                  </button>
                  <p className="text-xs text-gray-500 mt-4 italic">Lưu ý: Chỉ mình Admin mới thấy và đổi được mã này.</p>
              </div>
          </div>
      )}

      {/* ... (Các tab khác vocab, study_logs, messages giữ nguyên logic render như cũ) */}
      {/* CONTENT: VOCABULARY MANAGEMENT TAB */}
      {activeTab === 'vocab' && (
          <div className="flex flex-col h-full">
               {/* Toolbar */}
               <div className="p-4 md:p-6 space-y-4">
                   <div className="flex flex-wrap gap-4 items-center bg-[#1f2937]/50 p-4 rounded-xl border border-gray-700 justify-between">
                       <div className="flex items-center gap-4 flex-wrap">
                           <div className="flex items-center gap-2">
                               <Filter size={16} className="text-gray-400" />
                               <select 
                                    value={vocabFilterTopic}
                                    onChange={(e) => setVocabFilterTopic(e.target.value)}
                                    className="bg-black/40 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                               >
                                   <option value="all">Tất cả chủ đề</option>
                                   {Array.from({length: 17}, (_, i) => (
                                      <option key={i} value={`topic_${i+1}`}>Chủ đề {i+1}</option>
                                   ))}
                               </select>
                           </div>
                           <button onClick={fetchVocab} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors" title="Làm mới">
                               <RefreshCw size={16} className={vocabLoading ? "animate-spin" : ""} />
                           </button>
                       </div>

                       <div className="flex items-center gap-3">
                           <span className="text-sm text-gray-400 hidden sm:inline">Đã chọn: <span className="text-white font-bold">{selectedVocabIds.size}</span> / {vocabList.length}</span>
                           <button onClick={selectAllVocab} className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-bold border border-blue-600/30">
                               {selectedVocabIds.size === vocabList.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                           </button>
                           <button 
                                onClick={() => initiateDelete('vocab')}
                                disabled={selectedVocabIds.size === 0}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 transition-all ${selectedVocabIds.size > 0 ? 'bg-red-500 text-white border-red-600 hover:bg-red-600 shadow-lg' : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'}`}
                           >
                               <Trash2 size={14} /> <span className="hidden sm:inline">Xóa</span> ({selectedVocabIds.size})
                           </button>
                       </div>
                   </div>
               </div>

               {/* Table Header */}
               <div className="px-6 grid grid-cols-12 gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-700 mx-4 md:mx-6">
                   <div className="col-span-2 md:col-span-1 text-center">Chọn</div>
                   <div className="col-span-4 md:col-span-3">Từ vựng</div>
                   <div className="col-span-4 md:col-span-4">Nghĩa tiếng Việt</div>
                   <div className="hidden md:block col-span-2">Loại/Phiên âm</div>
                   <div className="col-span-2 text-right">Chủ đề</div>
               </div>

               {/* Vocab List */}
               <div className="flex-grow overflow-y-auto px-4 md:px-6 pb-20 custom-scrollbar">
                   {vocabLoading ? (
                       <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-purple-500 rounded-full border-t-transparent"></div></div>
                   ) : vocabList.length === 0 ? (
                       <div className="text-center py-20 text-gray-500">Không tìm thấy từ vựng nào.</div>
                   ) : (
                       <div className="space-y-1 mt-2">
                           {vocabList.map((vocab) => (
                               <div 
                                    key={vocab.id} 
                                    className={`grid grid-cols-12 gap-4 items-center p-3 rounded-lg border transition-colors cursor-pointer text-sm ${selectedVocabIds.has(vocab.id) ? 'bg-purple-900/20 border-purple-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                    onClick={() => toggleSelectVocab(vocab.id)}
                               >
                                   <div className="col-span-2 md:col-span-1 flex justify-center">
                                       <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedVocabIds.has(vocab.id) ? 'bg-purple-500 border-purple-500' : 'border-gray-600'}`}>
                                           {selectedVocabIds.has(vocab.id) && <CheckSquare size={10} className="text-white" />}
                                       </div>
                                   </div>
                                   <div className="col-span-4 md:col-span-3 font-bold text-white truncate">{vocab.word}</div>
                                   <div className="col-span-4 md:col-span-4 text-gray-300 truncate" title={vocab.meaning}>{vocab.meaning}</div>
                                   <div className="hidden md:block col-span-2 text-gray-500 text-xs">
                                       <span className="text-purple-400 font-bold">{vocab.type}</span> • {vocab.pronunciation}
                                   </div>
                                   <div className="col-span-2 text-right text-xs text-gray-500 bg-white/5 px-2 py-1 rounded w-fit ml-auto">
                                       {vocab.topicId?.replace('topic_', 'CĐ ')}
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
          </div>
      )}

      {/* CONTENT: STUDY LOGS MANAGEMENT TAB */}
      {activeTab === 'study_logs' && (
          <div className="flex flex-col h-full">
               {/* Toolbar */}
               <div className="p-4 md:p-6 space-y-4">
                   <div className="flex flex-wrap gap-4 items-center bg-[#1f2937]/50 p-4 rounded-xl border border-gray-700 justify-between">
                       <div className="flex items-center gap-4">
                           <h3 className="text-white font-bold flex items-center gap-2">
                               <Clock size={18} className="text-yellow-400" />
                               <span className="hidden sm:inline">Nhật ký học (100 log gần nhất)</span>
                               <span className="sm:hidden">Nhật ký</span>
                           </h3>
                           <button onClick={fetchStudyLogs} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors" title="Làm mới">
                               <RefreshCw size={16} className={logsLoading ? "animate-spin" : ""} />
                           </button>
                       </div>

                       <div className="flex items-center gap-3">
                           <span className="text-sm text-gray-400 hidden sm:inline">Đã chọn: <span className="text-white font-bold">{selectedLogIds.size}</span></span>
                           <button onClick={selectAllLogs} className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-bold border border-blue-600/30">
                               {selectedLogIds.size === studyLogs.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                           </button>
                           <button 
                                onClick={() => initiateDelete('study_logs')}
                                disabled={selectedLogIds.size === 0}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 transition-all ${selectedLogIds.size > 0 ? 'bg-red-500 text-white border-red-600 hover:bg-red-600 shadow-lg' : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'}`}
                           >
                               <Trash2 size={14} /> <span className="hidden sm:inline">Xóa</span> ({selectedLogIds.size})
                           </button>
                       </div>
                   </div>
               </div>

               {/* Table Header */}
               <div className="px-6 grid grid-cols-12 gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-700 mx-4 md:mx-6">
                   <div className="col-span-2 md:col-span-1 text-center">Chọn</div>
                   <div className="col-span-3 md:col-span-3">Người dùng</div>
                   <div className="col-span-3 md:col-span-2">Môn/Giờ</div>
                   <div className="col-span-2 md:col-span-4">Ghi chú</div>
                   <div className="col-span-2 text-right">Ngày giờ</div>
               </div>

               {/* Log List */}
               <div className="flex-grow overflow-y-auto px-4 md:px-6 pb-20 custom-scrollbar">
                   {logsLoading ? (
                       <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-2 border-yellow-500 rounded-full border-t-transparent"></div></div>
                   ) : studyLogs.length === 0 ? (
                       <div className="text-center py-20 text-gray-500">Chưa có nhật ký học nào.</div>
                   ) : (
                       <div className="space-y-1 mt-2">
                           {studyLogs.map((log) => (
                               <div 
                                    key={log.id} 
                                    className={`grid grid-cols-12 gap-4 items-center p-3 rounded-lg border transition-colors cursor-pointer text-sm ${selectedLogIds.has(log.id) ? 'bg-yellow-900/20 border-yellow-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                                    onClick={() => toggleSelectLog(log.id)}
                               >
                                   <div className="col-span-2 md:col-span-1 flex justify-center">
                                       <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedLogIds.has(log.id) ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600'}`}>
                                           {selectedLogIds.has(log.id) && <CheckSquare size={10} className="text-black" />}
                                       </div>
                                   </div>
                                   <div className="col-span-3 md:col-span-3 flex items-center gap-2 overflow-hidden">
                                        <img src={log.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${log.userName}`} className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0" alt="" />
                                        <div className="truncate font-bold text-white text-xs">{log.userName}</div>
                                   </div>
                                   <div className="col-span-3 md:col-span-2 text-gray-300">
                                       <span className="text-yellow-400 font-bold">{log.subject}</span>
                                       <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                            {log.durationMinutes}/{log.targetMinutes}p
                                            {log.isCompleted ? <CheckCircle size={10} className="text-green-500"/> : <AlertCircle size={10} className="text-orange-500"/>}
                                       </div>
                                   </div>
                                   <div className="col-span-2 md:col-span-4 text-gray-400 text-xs italic truncate" title={log.notes}>
                                       {log.notes || "Không có ghi chú"}
                                   </div>
                                   <div className="col-span-2 text-right text-[10px] text-gray-500">
                                       {formatDate(log.timestamp)}
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
          </div>
      )}

      {/* CONTENT: MESSAGES TAB */}
      {activeTab === 'messages' && (
        <>
            {/* Toolbar */}
            <div className="p-4 md:p-6 space-y-4">
                {/* Actions Row */}
                <div className="flex flex-wrap gap-3 items-center bg-[#1f2937]/50 p-3 rounded-xl border border-gray-700">
                    <button onClick={selectAll} className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg border border-emerald-600/30 text-xs font-semibold transition-all">
                        <CheckSquare size={14} /> Chọn tất cả
                    </button>
                    <button onClick={deselectAll} className="flex items-center gap-2 px-3 py-2 bg-gray-600/20 text-gray-300 hover:bg-gray-600/30 rounded-lg border border-gray-600/30 text-xs font-semibold transition-all">
                        <X size={14} /> Bỏ chọn
                    </button>
                    <div className="h-6 w-px bg-gray-700 mx-2 hidden sm:block"></div>
                    <button 
                        onClick={() => initiateDelete('messages')} 
                        disabled={selectedIds.size === 0}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${selectedIds.size > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 cursor-pointer' : 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'}`}
                    >
                        <Trash2 size={14} /> Xóa đã chọn ({selectedIds.size})
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 rounded-lg border border-cyan-600/30 text-xs font-semibold transition-all ml-auto">
                        <Download size={14} /> Xuất file
                    </button>
                </div>

                {/* Filter Row */}
                <div className="flex gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm lời chúc..." 
                            className="w-full bg-[#111827] border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-grow overflow-y-auto px-4 md:px-6 pb-20 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMessages.map(msg => (
                        <div 
                            key={msg.id}
                            onClick={() => toggleSelect(msg.id)}
                            className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${selectedIds.has(msg.id) ? 'bg-purple-900/20 border-purple-500 shadow-lg shadow-purple-500/10' : 'bg-[#1f2937] border-gray-800 hover:border-gray-600'}`}
                        >
                            <div className="absolute top-3 left-3 z-10">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.has(msg.id) ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-500 bg-black/40 group-hover:border-gray-300'}`}>
                                    {selectedIds.has(msg.id) && <CheckSquare size={14} />}
                                </div>
                            </div>
                            <div className="flex justify-between items-start pl-8 mb-2">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider line-clamp-1">{msg.author}</span>
                                    <span className="text-[10px] text-gray-600">{formatDate(msg.timestamp)}</span>
                                </div>
                                {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="thumb" className="w-10 h-10 object-cover rounded border border-gray-700" />
                                )}
                            </div>
                            <div className="pl-8">
                                <p className="text-sm text-gray-300 italic line-clamp-3">"{msg.content}"</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;