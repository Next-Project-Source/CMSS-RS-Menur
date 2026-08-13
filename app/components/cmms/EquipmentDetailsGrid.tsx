"use client";

import React from "react";
import { EquipmentDetails } from "@/app/types/equipment";
import { Award, Wrench, AlertCircle, MapPin } from "lucide-react";

interface EquipmentDetailsGridProps {
  details: EquipmentDetails;
  equipmentName?: string;
  onOpenCertificate?: () => void;
}

export const EquipmentDetailsGrid: React.FC<EquipmentDetailsGridProps> = ({
  details,
  equipmentName = "Alat Kesehatan",
  onOpenCertificate,
}) => {
  const handleSertifikatClick = () => {
    if (onOpenCertificate) {
      onOpenCertificate();
    }
  };

  const handleLaporIpsClick = () => {
    const rawMessage = `Halo Tim IPS, saya ingin melaporkan kendala pada alat *${equipmentName}* (No. Aset: ${details.noAset}, Ruangan: ${details.ruangan}). Mohon bantuannya untuk pengecekan.`;
    const encodedMessage = encodeURIComponent(rawMessage);
    const waUrl = `https://wa.me/6281334062046?text=${encodedMessage}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-5">
      {/* Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {/* Merk / Tipe */}
        <div className="flex items-center justify-between py-3 px-4 hover:bg-slate-50/50 transition-colors">
          <span className="text-sm font-medium text-slate-500">
            Merk / Tipe
          </span>
          <span className="text-sm font-semibold text-slate-900 text-right">
            {details.merkTipe}
          </span>
        </div>

        {/* No. Seri */}
        <div className="flex items-center justify-between py-3 px-4 hover:bg-slate-50/50 transition-colors">
          <span className="text-sm font-medium text-slate-500">
            No. Seri
          </span>
          <span className="text-sm font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-right">
            {details.noSeri}
          </span>
        </div>

        {/* No. Aset */}
        <div className="flex items-center justify-between py-3 px-4 hover:bg-slate-50/50 transition-colors">
          <span className="text-sm font-medium text-slate-500">
            No. Aset
          </span>
          <span className="text-sm font-semibold text-slate-900 text-right">
            {details.noAset}
          </span>
        </div>

        {/* Ruangan */}
        <div className="flex items-center justify-between py-3 px-4 hover:bg-slate-50/50 transition-colors">
          <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            Ruangan
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
            {details.ruangan}
          </span>
        </div>

        {/* Tgl. Kalibrasi */}
        <div className="flex items-center justify-between py-3 px-4 hover:bg-slate-50/50 transition-colors">
          <span className="text-sm font-medium text-slate-500">
            Tgl. Kalibrasi
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 bg-red-50 border border-red-200/80 px-2.5 py-0.5 rounded-md shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            {details.tglKalibrasi}
          </span>
        </div>
      </div>

      {/* Action Buttons: Side-by-Side */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleSertifikatClick}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold text-sm shadow-xs hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all duration-150 cursor-pointer"
        >
          <Award className="w-4 h-4 text-slate-600" />
          <span>Sertifikat</span>
        </button>

        <button
          type="button"
          onClick={handleLaporIpsClick}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all duration-150 cursor-pointer"
        >
          <Wrench className="w-4 h-4 text-white" />
          <span>Lapor IPS</span>
        </button>
      </div>
    </div>
  );
};
