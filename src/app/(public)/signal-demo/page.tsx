"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/primitives/Alert";
import { Badge } from "@/components/ui/primitives/Badge";
import { Button } from "@/components/ui/primitives/Button";
import { Card, CardContent } from "@/components/ui/primitives/Card";
import { Progress } from "@/components/ui/primitives/Progress";
import { ScreenFrame } from "@/components/ui/layout/ScreenFrame";

export default function SignalDemoPage() {
  const [inputValue, setInputValue] = useState("");
  const [progress, setProgress] = useState(60);
  const [clicked, setClicked] = useState<string | null>(null);

  const isNikValid = /^\d{16}$/.test(inputValue);
  const isNikError = inputValue.length > 0 && !isNikValid;

  return (
    <ScreenFrame title="Signal UI — Component Demo" tone="default">
      <div className="flex flex-col gap-5">
        {/* Section: Typography & Brand */}
        <Card>
          <CardContent className="flex flex-col gap-2">
            <h2 className="type-h5 text-signal-text-primary">Tipografi & Identitas Brand</h2>
            <p className="type-body1 text-signal-text-primary">
              Body text 1 menggunakan token Telkomsel Signal DS (warna{" "}
              <code className="bg-muted px-1 rounded">--signal-text-primary</code>).
            </p>
            <p className="type-body2 text-signal-text-secondary">
              Helper text menggunakan token{" "}
              <code className="bg-muted px-1 rounded">--signal-text-secondary</code>.
            </p>
          </CardContent>
        </Card>

        {/* Section: Buttons */}
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="type-h6 text-signal-text-primary">Tombol (Signal Variants)</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" onClick={() => setClicked("primary")}>
                Primary CTA
              </Button>
              <Button variant="secondary" onClick={() => setClicked("secondary")}>
                Secondary Dark
              </Button>
              <Button variant="outline" onClick={() => setClicked("outline")}>
                Outline
              </Button>
              <Button variant="success" onClick={() => setClicked("success")}>
                Success
              </Button>
              <Button variant="destructive" onClick={() => setClicked("destructive")}>
                Destructive
              </Button>
              <Button variant="ghost" onClick={() => setClicked("ghost")}>
                Ghost
              </Button>
              <Button disabled>Disabled</Button>
            </div>
            {clicked && (
              <p className="type-body2 text-signal-text-secondary">
                Diklik: <strong>{clicked}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Section: Badges */}
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="type-h6 text-signal-text-primary">Badges</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Tersedia</Badge>
              <Badge variant="warning">Hampir Habis</Badge>
              <Badge variant="error">Habis Terjual</Badge>
              <Badge variant="info">Informasi</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Section: Input NIK */}
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="type-h6 text-signal-text-primary">Input NIK — Validation</h2>
            <div className="flex flex-col gap-1">
              <label htmlFor="nik-input" className="type-body2 text-signal-text-secondary">
                NIK Attendee
              </label>
              <input
                id="nik-input"
                type="text"
                placeholder="Masukkan 16 digit NIK"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className={`w-full rounded-md border px-3 py-2 type-body1 outline-none transition-colors focus:ring-2 focus:ring-primary/50 ${
                  isNikError
                    ? "border-signal-error text-signal-error"
                    : "border-border text-signal-text-primary"
                }`}
              />
              {isNikError && (
                <p className="type-body2 text-signal-error">
                  NIK harus 16 digit angka ({inputValue.length}/16)
                </p>
              )}
              {isNikValid && <p className="type-body2 text-signal-valid">✓ Format NIK valid</p>}
            </div>
          </CardContent>
        </Card>

        {/* Section: Progress */}
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="type-h6 text-signal-text-primary">Progress Bar Antrian</h2>
            <div className="flex justify-between text-xs text-signal-text-secondary">
              <span>Posisi Antrian: {Math.round((progress / 100) * 500)} / 500</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setProgress((p) => Math.max(0, p - 10))}>
                −10%
              </Button>
              <Button variant="outline" size="sm" onClick={() => setProgress((p) => Math.min(100, p + 10))}>
                +10%
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section: Alerts */}
        <Alert variant="warning">
          Sesi booking berlaku selama 10 menit. Pastikan data NIK sudah benar sebelum checkout.
        </Alert>

        <Alert variant="info">
          Implementasi menggunakan Radix UI + Signal Design Tokens (ADR-0012). Bukan @signal-web-ui/react
          langsung.
        </Alert>

        {/* Package Info */}
        <Card>
          <CardContent className="flex flex-col gap-1">
            <h2 className="type-h6 text-signal-text-primary">Package Info</h2>
            <p className="type-body2 text-signal-text-primary">Radix UI + Signal Tokens ✓</p>
            <p className="type-body2 text-signal-text-secondary">
              Shadcn-style primitives dengan token Signal DS (ADR-0012)
            </p>
          </CardContent>
        </Card>
      </div>
    </ScreenFrame>
  );
}
