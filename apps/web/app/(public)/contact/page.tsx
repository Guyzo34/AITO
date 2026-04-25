"use client";

import type { Metadata } from "next";
import { useState } from "react";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* Formulaire de contact — Phase 1 : simulation d'envoi */
export default function ContactPage() {
  const [form, setForm] = useState({
    nom: "",
    email: "",
    sujet: "",
    message: ""
  });
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

    /* Simulation d'envoi — à connecter à un service email en Phase 2 */
    await new Promise((resolve) => window.setTimeout(resolve, 1200));

    setSent(true);
    setPending(false);
  }

  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="bg-muted px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Nous contacter</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Une question, une demande d'adhésion ou simplement envie d'échanger ?
            Nous vous répondrons dans les plus brefs délais.
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">

          {/* Informations de contact */}
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Coordonnées</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                N'hésitez pas à nous rejoindre lors de nos permanences ou à nous écrire.
              </p>
            </div>

            {[
              {
                icon: MapPin,
                titre: "Adresse",
                contenu: "Montpellier, Hérault (34)\nFrance"
              },
              {
                icon: Mail,
                titre: "Email",
                contenu: "contact@aimh.fr"
              },
              {
                icon: Phone,
                titre: "Téléphone",
                contenu: "+33 6 00 00 00 00"
              }
            ].map((item) => (
              <div key={item.titre} className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.titre}</p>
                  <p className="mt-0.5 text-sm leading-6 text-muted-foreground whitespace-pre-line">
                    {item.contenu}
                  </p>
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-border bg-accent/50 p-4">
              <p className="text-sm font-medium text-accent-foreground">Permanence administrative</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tous les jeudis de 18h à 20h — Maison de Quartier des Beaux-Arts, Montpellier
              </p>
            </div>
          </div>

          {/* Formulaire */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Envoyer un message</CardTitle>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <CheckCircle2 className="size-12 text-secondary" />
                  <div>
                    <p className="font-semibold text-foreground">Message envoyé !</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Merci {form.nom}. Nous vous répondrons à {form.email} dès que possible.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => { setSent(false); setForm({ nom: "", email: "", sujet: "", message: "" }); }}>
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="nom">Nom complet *</Label>
                      <Input
                        id="nom"
                        required
                        placeholder="Votre nom"
                        value={form.nom}
                        onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="votre@email.fr"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sujet">Sujet *</Label>
                    <Input
                      id="sujet"
                      required
                      placeholder="L'objet de votre message"
                      value={form.sujet}
                      onChange={(e) => setForm((f) => ({ ...f, sujet: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      required
                      placeholder="Écrivez votre message ici…"
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? "Envoi en cours…" : "Envoyer le message"}
                    <Send className="size-4" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
