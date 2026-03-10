import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Send, Upload, X, Info, ImageIcon, Video } from "lucide-react";

function TALivePreview({ commentary, mediaPreviewUrl, mediaType }: {
  commentary: string;
  mediaPreviewUrl: string | null;
  mediaType: "image" | "video" | null;
}) {
  const description = commentary.trim() || "\u2014";
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dateStr = `Today at ${timeStr}`;

  return (
    <Card className="sticky top-20" data-testid="card-ta-live-preview">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20">
            <span className="text-sm">🔮</span>
          </div>
          <h2 className="font-bold text-lg" data-testid="text-ta-preview-title">Live Preview</h2>
        </div>

        <div className="rounded-lg bg-[#1a1d23] border border-[#2a2d35] overflow-hidden">
          <div className="p-4 space-y-2 text-sm text-[#dcddde]">
            <p className="text-[#dcddde] text-sm font-medium" data-testid="text-ta-preview-everyone">@everyone</p>

            <div className="flex gap-1">
              <div className="w-1 rounded-full bg-[#5865F2] shrink-0" />
              <div className="flex-1 pl-3 space-y-2">
                <p className="font-bold text-white" data-testid="text-ta-preview-title-embed">Technical Analysis</p>
                <div className="whitespace-pre-wrap break-words leading-relaxed text-[#dcddde]" data-testid="text-ta-preview-commentary">
                  {description}
                </div>

                {mediaPreviewUrl && mediaType === "image" && (
                  <div className="rounded overflow-hidden mt-2" data-testid="preview-ta-image">
                    <img
                      src={mediaPreviewUrl}
                      alt="TA Preview"
                      className="w-full max-h-[300px] object-contain rounded"
                    />
                  </div>
                )}

                {mediaPreviewUrl && mediaType === "video" && (
                  <div className="rounded overflow-hidden mt-2" data-testid="preview-ta-video">
                    <video
                      src={mediaPreviewUrl}
                      controls
                      className="w-full max-h-[300px] rounded"
                    />
                  </div>
                )}

                <div className="flex items-center gap-1 pt-1">
                  <span className="text-[10px] text-[#72767d]">Crowned Trader</span>
                  <span className="text-[10px] text-[#72767d]">•</span>
                  <span className="text-[10px] text-[#72767d]">{dateStr}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#12141a] border-t border-[#2a2d35] px-4 py-3 flex items-start gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/30 shrink-0 mt-0.5">
              <Info className="h-3 w-3 text-blue-400" />
            </div>
            <p className="text-xs text-[#72767d]">
              This is how your TA will appear in Discord. Update the form to see changes in real-time.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SendTA() {
  const { data: currentUser } = useAuth();
  const { toast } = useToast();

  const userChannels = currentUser?.discordChannels || [];

  const [channel, setChannel] = useState(userChannels.length > 0 ? userChannels[0].name : "");
  const [commentary, setCommentary] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file.type.startsWith("image/")) {
      setMediaType("image");
    } else if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      toast({ title: "Unsupported file type. Please upload an image or video.", variant: "destructive" });
      return;
    }
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreviewUrl(url);
  }, [toast]);

  const clearMedia = useCallback(() => {
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [mediaPreviewUrl]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  async function handleSubmit() {
    if (!channel) {
      toast({ title: "Please select a destination channel", variant: "destructive" });
      return;
    }
    if (!mediaFile && !commentary.trim()) {
      toast({ title: "Please add commentary or upload media — cannot send an empty message", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("channel", channel);
      formData.append("commentary", commentary);
      if (mediaFile) {
        formData.append("media", mediaFile);
      }

      const res = await fetch("/api/send-ta", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to send TA" }));
        throw new Error(err.message);
      }

      toast({ title: "Technical Analysis sent successfully!" });
      setCommentary("");
      clearMedia();
    } catch (err: any) {
      toast({ title: err.message || "Failed to send TA", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title-ta">
          <Send className="h-6 w-6" />
          Send TA
        </h1>
        <p className="text-muted-foreground mt-1">Post technical analysis with media to Discord</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        <div>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <ImageIcon className="h-4 w-4 text-blue-500" />
                </div>
                <h3 className="font-semibold text-lg">Technical Analysis</h3>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-sm">Destination Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger data-testid="select-ta-channel">
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {userChannels.map((ch: any, i: number) => (
                      <SelectItem key={i} value={ch.name} data-testid={`option-ta-channel-${i}`}>
                        {ch.name} {i === 0 ? "(Default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-sm">
                  TA Media (Image or Video)
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-ta-media-file"
                />
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : mediaFile
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-border hover:border-muted-foreground/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !mediaFile && fileInputRef.current?.click()}
                  data-testid="dropzone-ta-media"
                >
                  {mediaFile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                        {mediaType === "image" ? <ImageIcon className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                        <span className="font-medium text-sm">{mediaFile.name}</span>
                      </div>
                      {mediaPreviewUrl && mediaType === "image" && (
                        <img
                          src={mediaPreviewUrl}
                          alt="Preview"
                          className="mx-auto max-h-48 rounded-lg object-contain"
                          data-testid="img-ta-media-preview"
                        />
                      )}
                      {mediaPreviewUrl && mediaType === "video" && (
                        <video
                          src={mediaPreviewUrl}
                          controls
                          className="mx-auto max-h-48 rounded-lg"
                          data-testid="video-ta-media-preview"
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); clearMedia(); }}
                        data-testid="button-clear-ta-media"
                      >
                        <X className="h-3 w-3 mr-1" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Drag & drop a file here</p>
                        <p className="text-xs text-muted-foreground">or click to browse (images/videos)</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported: images and video clips. Keep files small enough for Discord webhook limits.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-sm">Commentary</Label>
                <Textarea
                  value={commentary}
                  onChange={(e) => setCommentary(e.target.value)}
                  placeholder="Write your analysis..."
                  rows={6}
                  data-testid="textarea-ta-commentary"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: this will be sent with the media.
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={isSending}
                data-testid="button-send-ta"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : "Publish TA"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6">
          <TALivePreview
            commentary={commentary}
            mediaPreviewUrl={mediaPreviewUrl}
            mediaType={mediaType}
          />
        </div>
      </div>
    </div>
  );
}
