"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileUp, Trash2, BookOpen, Loader2, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { Resource } from "@/types";

export default function AdminResourcesPage() {
  const { token } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileData, setFileData] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileSize, setFileSize] = useState(0);

  // Fetch resources
  const fetchResources = () => {
    if (!token) return;
    setLoading(true);
    api<{ resources: Resource[] }>("/api/resources", { token })
      .then((res) => setResources(res.resources))
      .catch(() => toast.error("Failed to load resources"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchResources();
  }, [token]);

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      e.target.value = ""; // clear input
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      setFileData(base64String);
      setFileName(file.name);
      const ext = file.name.split(".").pop() || "";
      setFileType(ext);
      setFileSize(file.size);
    };
    reader.readAsDataURL(file);
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!title || !fileData) {
      toast.error("Please fill in all fields and select a file");
      return;
    }

    setUploading(true);
    api<{ success: boolean; resource: Resource }>("/api/resources/admin", {
      method: "POST",
      token,
      body: JSON.stringify({
        title,
        description,
        fileName,
        fileType,
        fileSize,
        fileData,
      }),
    })
      .then(() => {
        toast.success("Resource uploaded successfully");
        setTitle("");
        setDescription("");
        setFileData("");
        setFileName("");
        setFileType("");
        setFileSize(0);
        // Clear file input
        const fileInput = document.getElementById("file-upload") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        fetchResources();
      })
      .catch((err: any) => {
        toast.error(err.message || "Failed to upload resource");
      })
      .finally(() => setUploading(false));
  };

  // Delete resource
  const handleDelete = (id: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this resource?")) return;

    api<{ success: boolean }>((`/api/resources/admin/${id}` as any), {
      method: "DELETE",
      token,
    })
      .then(() => {
        toast.success("Resource deleted successfully");
        fetchResources();
      })
      .catch(() => {
        toast.error("Failed to delete resource");
      });
  };

  const handleDownload = async (resource: Resource) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/resources/${resource.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resource.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Download failed");
    }
  };

  return (
    <ProtectedRoute role="ADMIN">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-900 pb-5">
          <div className="space-y-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-450 hover:text-white transition-colors uppercase font-bold tracking-wider mb-2"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Manage Study Resources</h1>
            <p className="text-sm text-neutral-400">Upload study materials, references, or PDFs for candidates.</p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Upload Card */}
          <div className="lg:col-span-1">
            <Card className="border-neutral-850 bg-neutral-950/50 backdrop-blur-md shadow-2xl sticky top-8">
              <CardHeader className="border-b border-neutral-900 pb-4 mb-4">
                <CardTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-violet-400" /> Upload Resource
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400">
                  Provide reference files (PDF, DOC, ZIP, Image) up to 10MB.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">
                      Resource Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g. System Design Cheat Sheet"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Add brief details about the study resource..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="text-neutral-300 font-semibold text-xs uppercase tracking-wider">
                      Choose File
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      onChange={handleFileChange}
                      required
                      className="cursor-pointer file:mr-4 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-750"
                    />
                    {fileName && (
                      <p className="text-[10px] text-neutral-450 truncate mt-1.5 font-mono">
                        Selected: {fileName} ({(fileSize / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={uploading}
                    className="w-full bg-violet-600 hover:bg-violet-750 text-white font-semibold transition-all mt-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      "Upload Resource"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* List Card */}
          <div className="lg:col-span-2">
            <Card className="border-neutral-850 bg-neutral-950/50 backdrop-blur-md shadow-2xl">
              <CardHeader className="border-b border-neutral-900 pb-4 mb-4">
                <CardTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-violet-400" /> Active Resources
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400">
                  Currently uploaded files visible to candidates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                  </div>
                ) : resources.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-12 text-center">No study resources uploaded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex flex-col gap-4 rounded-xl border border-neutral-900 p-4 sm:flex-row sm:items-center sm:justify-between bg-neutral-950/20 hover:bg-neutral-900/30 hover:border-neutral-800 transition-all duration-200 shadow-sm"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-sm text-neutral-200 tracking-tight truncate max-w-[280px]" title={resource.title}>
                              {resource.title}
                            </p>
                            <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[9px] uppercase font-extrabold tracking-wider py-0.5 px-2.5">
                              {resource.fileType}
                            </Badge>
                          </div>
                          {resource.description && (
                            <p className="text-xs text-neutral-450 line-clamp-2 leading-relaxed">
                              {resource.description}
                            </p>
                          )}
                          <p className="text-[10px] text-neutral-500">
                            {(resource.fileSize / 1024 / 1024).toFixed(2)} MB · Uploaded: {new Date(resource.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 justify-end sm:shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-neutral-800 text-[10px] font-extrabold uppercase text-neutral-350 bg-black/40 hover:bg-neutral-850 hover:text-white"
                            onClick={() => handleDownload(resource)}
                          >
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-neutral-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                            onClick={() => handleDelete(resource.id)}
                            title="Delete resource"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
