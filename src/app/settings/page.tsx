"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Copy, RefreshCw, Eye, EyeOff } from "lucide-react";

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "fv_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setApiKey(generateApiKey());
    setShowKey(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your API key and configuration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your API key is used to authenticate CLI requests. Set it as the{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">API_KEY</code>{" "}
            environment variable on your server, then use the same key in your
            CLI config.
          </p>

          <div className="space-y-2">
            <Label>Generated Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  readOnly
                  placeholder="Click generate to create a key"
                  className="pr-10 font-mono"
                />
                {apiKey && (
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              <Button onClick={handleGenerate} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              {apiKey && (
                <Button onClick={handleCopy} variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            {copied && (
              <p className="text-xs text-green-600">Copied to clipboard</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CLI Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Configure the CLI to connect to this server:
          </p>
          <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
            {`vault config --api-url https://your-deployment.vercel.app --api-key YOUR_KEY`}
          </pre>
          <p className="text-sm text-muted-foreground">
            Then scan footage:
          </p>
          <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
            {`vault scan /path/to/footage --dest "Drive A"`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
