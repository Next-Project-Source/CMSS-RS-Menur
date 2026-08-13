"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  Search,
  ShieldPlus,
  Cpu,
  ScanLine,
  ChevronRight,
  Filter,
  Layers,
  Calendar,
  LogIn,
  SearchX,
  PlusCircle,
  ShieldCheck,
  LogOut,
  FileSpreadsheet,
  MapPin,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RS_MENUR_ROOMS } from "@/app/lib/constants";

import { AddEquipmentFormModal } from "@/app/components/cmms/AddEquipmentFormModal";
import { ImportCsvModal } from "@/app/components/cmms/ImportCsvModal";
import { QRScannerModal } from "@/app/components/cmms/QRScannerModal";
import {
  ToastNotification,
  Toast,
} from "@/app/components/cmms/ToastNotification";
import { CustomDropdown } from "@/app/components/cmms/CustomDropdown";

interface EquipmentCardItem {
  id: string;
  name: string;
  room: string;
  serialNumber: string;
  status: "Baik" | "Rusak" | "Kalibrasi" | string;
  tglKalibrasi: string;
  imageUrl: string;
}

type CalibrationStatus = 'SAFE' | 'WARNING' | 'EXPIRED' | 'UNKNOWN';

const getCalibrationStatus = (calibrationDateStr: string): CalibrationStatus => {
  if (!calibrationDateStr || calibrationDateStr === "-") return 'UNKNOWN';

  const lastCalDate = new Date(calibrationDateStr);
  if (isNaN(lastCalDate.getTime())) return 'UNKNOWN';

  const expiryDate = new Date(lastCalDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const warningDate = new Date(expiryDate);
  warningDate.setMonth(warningDate.getMonth() - 3);

  const now = new Date();

  if (now >= expiryDate) return 'EXPIRED';
  if (now >= warningDate) return 'WARNING';
  return 'SAFE';
};

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Semua Status");
  const [roomFilter, setRoomFilter] = useState<string>("Semua Ruangan");

  const [equipmentList, setEquipmentList] = useState<EquipmentCardItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, roomFilter]);

  // ─── Analytics Dashboard Logic ─────────────────────────
  const dashboardStats = useMemo(() => {
    let operationalCount = 0;
    let needsRepairCount = 0;
    let calibrationDueCount = 0;

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    equipmentList.forEach((item) => {
      // 1. Status Counts
      if (item.status === "Baik") {
        operationalCount++;
      } else if (item.status === "Rusak" || item.status === "Perlu Perbaikan") {
        needsRepairCount++;
      }

      // 2. Calibration Due Logic
      const calStatus = getCalibrationStatus(item.tglKalibrasi);
      if (calStatus === 'WARNING' || calStatus === 'EXPIRED') {
        calibrationDueCount++;
      }
    });

    return {
      totalEquipment: equipmentList.length,
      operationalCount,
      needsRepairCount,
      calibrationDueCount,
    };
  }, [equipmentList]);

  // ─── Admin Edit Mode & Add Equipment Modal State ─────────
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportCsvModalOpen, setIsImportCsvModalOpen] = useState<boolean>(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);

  // ─── Toast Notifications ─────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: "success" | "error") => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch live equipment list from Supabase
  const fetchEquipments = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("equipments")
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      console.error("Error fetching equipments from Supabase:", error);
    } else if (data) {
      const mapped: EquipmentCardItem[] = data.map((item: any) => ({
        id: item.id || "",
        name: item.name || "Alat Kesehatan",
        room: item.room || "Ruangan",
        serialNumber: item.serial_number || item.serialNumber || "-",
        status: item.status || "Baik",
        tglKalibrasi: item.calibration_date || item.tglKalibrasi || "-",
        imageUrl: item.image_url || item.imageUrl || "/placeholder-cpap.jpg",
      }));
      setEquipmentList(mapped);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchEquipments();
  }, [fetchEquipments]);

  // Restore persistent Admin Session from localStorage and sync with GlobalHeader
  useEffect(() => {
    const checkAdminState = () => {
      if (typeof window !== "undefined") {
        const savedAdmin = localStorage.getItem("isAdmin");
        setIsEditMode(savedAdmin === "true");
      }
    };
    checkAdminState();
    window.addEventListener("adminChange", checkAdminState);
    return () => {
      window.removeEventListener("adminChange", checkAdminState);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim() || "CPAP-3";
    router.push(`/equipment/${encodeURIComponent(query.toUpperCase())}`);
  };

  const handleCameraPlaceholderClick = () => {
    setIsScannerModalOpen(true);
  };

  // Filter live equipment cards by status and search text
  const filteredEquipment = equipmentList.filter((item) => {
    let matchesStatus = true;
    if (statusFilter === "NEED_CALIBRATION") {
      const calStatus = getCalibrationStatus(item.tglKalibrasi);
      matchesStatus = calStatus === 'WARNING' || calStatus === 'EXPIRED';
    } else if (statusFilter !== "Semua Status") {
      matchesStatus = item.status === statusFilter;
    }

    const matchesRoom =
      roomFilter === "Semua Ruangan"
        ? true
        : item.room && item.room.toLowerCase().includes(roomFilter.toLowerCase());
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === ""
        ? true
        : item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.serialNumber.toLowerCase().includes(q) ||
        item.room.toLowerCase().includes(q);
    return matchesStatus && matchesRoom && matchesSearch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEquipment = filteredEquipment.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadgeStyles = (status: "Baik" | "Rusak" | "Kalibrasi" | string) => {
    switch (status) {
      case "Baik":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Rusak":
        return "bg-red-100 text-red-700 border-red-200";
      case "Kalibrasi":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 py-8 px-4 sm:px-6 lg:px-8">
      {/* GLOBAL LAYOUT: max-w-7xl mx-auto */}
      <div className="max-w-7xl mx-auto">


        {/* Hero Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sistem Inventaris & Pemeliharaan Alat Medis
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Arahkan pemindai ke barcode alat untuk melihat riwayat atau cari ID aset secara manual.
          </p>
        </div>

        {/* ─── ANALYTICS DASHBOARD ─── */}
        {!isLoading && isEditMode && equipmentList.length > 0 && (
          <div className="mb-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Total Alat */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Alat</p>
                  <p className="text-2xl font-extrabold text-slate-900">{dashboardStats.totalEquipment}</p>
                </div>
              </div>

              {/* Siap Operasional */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Siap Operasional</p>
                  <p className="text-2xl font-extrabold text-slate-900">{dashboardStats.operationalCount}</p>
                </div>
              </div>

              {/* Sedang Rusak */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sedang Rusak</p>
                  <p className="text-2xl font-extrabold text-slate-900">{dashboardStats.needsRepairCount}</p>
                </div>
              </div>

              {/* Waktunya Kalibrasi */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waktunya Kalibrasi</p>
                  <p className="text-2xl font-extrabold text-slate-900">{dashboardStats.calibrationDueCount}</p>
                </div>
              </div>
            </div>

            {/* Urgent Alert Banner */}
            {dashboardStats.calibrationDueCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-800">⚠️ Peringatan Kalibrasi</h4>
                  <p className="text-xs text-red-700 mt-1 font-medium">
                    Ada <span className="font-extrabold">{dashboardStats.calibrationDueCount} alat</span> yang masa kalibrasinya akan habis dalam 3 bulan ke depan atau sudah lewat!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Search Area & Camera Scanner Placeholder */}
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/80 p-5 sm:p-6 mb-8">
          {/* Camera Viewfinder Placeholder */}
          <div
            onClick={handleCameraPlaceholderClick}
            className="group relative overflow-hidden bg-slate-900 rounded-2xl p-5 mb-5 border-2 border-dashed border-slate-700 hover:border-blue-500 transition-all cursor-pointer text-center"
          >
            <div className="absolute inset-0 bg-linear-to-b from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center justify-center py-2">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-white tracking-wide">
                Arahkan kamera ke Barcode alat
              </span>
              <span className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <ScanLine className="w-3 h-3 text-blue-400" />
                Klik untuk mengaktifkan pemindai kamera live
              </span>
            </div>
          </div>

          {/* Search Bar Input */}
          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masukkan ID Aset atau No. Seri (e.g., CPAP-3)"
              className="w-full pl-11 pr-24 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Cari Alat
            </button>
          </form>

          {/* Filters: Room and Status */}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>FILTER RUANGAN</span>
              </label>
              <CustomDropdown
                options={[
                  { value: "Semua Ruangan", label: "Semua Ruangan" },
                  ...RS_MENUR_ROOMS.map((r) => ({ value: r, label: r })),
                ]}
                value={roomFilter}
                onChange={(val) => setRoomFilter(val)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>FILTER STATUS</span>
              </label>
              <CustomDropdown
                options={[
                  { value: "Semua Status", label: "Semua Status" },
                  { value: "Baik", label: "Baik (Siap Operasional)" },
                  { value: "Rusak", label: "Rusak (Perlu Perbaikan)" },
                  { value: "Kalibrasi", label: "Kalibrasi (Jadwal Pemeliharaan)" },
                  { value: "NEED_CALIBRATION", label: "Butuh Kalibrasi (H-3 Bulan)" },
                ]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
              />
            </div>
          </div>
        </div>

        {/* Section Title for Equipment Grid & Admin Action Button */}
        <div className="flex items-center justify-between mb-4 px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Daftar Alat Kesehatan ({filteredEquipment.length})
            </h2>
          </div>

          {/* ADMIN ACTION BUTTON: Visible only when isEditMode is true */}
          {isEditMode && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportCsvModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer animate-fade-in"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Import CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer animate-fade-in"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Tambah Alat Baru</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Responsive Grid of Clickable Equipment Cards, Loading State, or Empty State UI */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-slate-700">
              Memuat Data Alat Medis...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Mengambil data secara langsung dari database Supabase
            </p>
          </div>
        ) : filteredEquipment.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedEquipment.map((item) => (
                <Link
                  key={item.id}
                  href={`/equipment/${item.id}`}
                  className="block group h-full"
                >
                  <div className="h-full bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-blue-300 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-150 flex items-center justify-between cursor-pointer overflow-hidden">
                    <div className="flex-1 min-w-0 pr-3 flex items-start gap-3 sm:gap-4">
                      {/* Equipment Photo Thumbnail */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200/80 bg-slate-50 p-1.5 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain rounded-xl"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-cpap.jpg";
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${getStatusBadgeStyles(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-500">
                            ID: {item.id}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium truncate">
                          Ruangan:{" "}
                          <span className="font-semibold text-slate-700">
                            {item.room}
                          </span>{" "}
                          • SN:{" "}
                          <span className="font-mono text-slate-700">
                            {item.serialNumber}
                          </span>
                        </p>

                        {/* REQUIREMENT 2: ENHANCED CARDS - Calibration date row */}
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Kalibrasi:</span>
                          <span className="font-semibold font-mono text-slate-700">
                            {item.tglKalibrasi}
                          </span>
                          {getCalibrationStatus(item.tglKalibrasi) === 'WARNING' && (
                            <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto whitespace-nowrap">
                              ⚠️ H-3 Bulan
                            </span>
                          )}
                          {getCalibrationStatus(item.tglKalibrasi) === 'EXPIRED' && (
                            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto whitespace-nowrap">
                              🚨 Kedaluwarsa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-2 sm:ml-4 w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">Tampilkan</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                  >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                  <span className="text-sm font-medium text-slate-500">per halaman</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-sm font-semibold text-slate-600 px-2">
                    Hal {currentPage} dari {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State UI for Search / Filter */
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-xs my-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <SearchX className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Tidak ada alat yang ditemukan
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Kombinasi pencarian, filter ruangan, dan filter status tidak mengembalikan hasil. Silakan sesuaikan kembali filter Anda.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("Semua Status");
                setRoomFilter("Semua Ruangan");
              }}
              className="mt-5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Reset Filter & Pencarian
            </button>
          </div>
        )}

        {/* ═══ ROOT-LEVEL MODALS & TOASTS ═══ */}


        <AddEquipmentFormModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={fetchEquipments}
          addToast={addToast}
        />

        <ImportCsvModal
          isOpen={isImportCsvModalOpen}
          onClose={() => setIsImportCsvModalOpen(false)}
          onSuccess={fetchEquipments}
          addToast={addToast}
        />

        <QRScannerModal
          isOpen={isScannerModalOpen}
          onClose={() => setIsScannerModalOpen(false)}
        />

        <ToastNotification toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
