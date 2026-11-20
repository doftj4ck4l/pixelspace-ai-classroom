"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DropletsIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import s from "./landing.module.css";

const CARDS = [
  [
    "Apakah sumber utama air di bumi?",
    "Laut, sungai, tasik dan air bawah tanah merupakan sumber air di bumi.",
  ],
  [
    "Apakah tiga keadaan jirim bagi air?",
    "Pepejal (ais), cecair (air) dan gas (wap air).",
  ],
  [
    "Apakah yang membekalkan tenaga untuk kitaran air?",
    "Matahari membekalkan tenaga haba untuk proses penyejatan.",
  ],
  [
    "Apakah maksud penyejatan?",
    "Proses air bertukar daripada cecair kepada wap air.",
  ],
  [
    "Bagaimanakah suhu mempengaruhi penyejatan?",
    "Semakin tinggi suhu, semakin cepat kadar penyejatan.",
  ],
  [
    "Apakah maksud kondensasi?",
    "Proses wap air menyejuk dan bertukar menjadi titisan air.",
  ],
  [
    "Bagaimanakah awan terbentuk?",
    "Wap air mengalami kondensasi menjadi titisan air yang halus di atmosfera.",
  ],
  [
    "Apakah maksud kerpasan?",
    "Air yang jatuh dari awan ke bumi, contohnya hujan.",
  ],
  [
    "Ke manakah air hujan mengalir?",
    "Air hujan mengalir ke sungai, tasik dan laut, atau meresap ke dalam tanah.",
  ],
  [
    "Apakah maksud transpirasi?",
    "Pembebasan wap air daripada tumbuhan melalui stoma pada daun.",
  ],
  [
    "Apakah yang dimaksudkan dengan air bawah tanah?",
    "Air yang meresap dan tersimpan di dalam tanah serta batuan.",
  ],
  [
    "Apakah maksud kitaran air (kitaran hidrologi)?",
    "Peredaran air yang berterusan antara permukaan bumi dengan atmosfera melalui penyejatan, kondensasi dan kerpasan.",
  ],
  [
    "Apakah peranan tumbuhan dalam kitaran air?",
    "Tumbuhan membebaskan wap air melalui proses transpirasi.",
  ],
  [
    "Mengapakah kitaran air penting?",
    "Kitaran air membekalkan air tawar kepada hidupan dan mengedarkan air di bumi.",
  ],
  [
    "Apakah maksud resapan air?",
    "Pergerakan air dari permukaan bumi masuk ke dalam tanah.",
  ],
  [
    "Apakah yang berlaku kepada air sungai?",
    "Air sungai mengalir ke laut dan boleh tersejat semula.",
  ],
  [
    "Adakah penyejatan berlaku pada suhu bilik?",
    "Ya. Penyejatan boleh berlaku pada permukaan air pada suhu bilik.",
  ],
  [
    "Apakah perbezaan wap air dengan titisan air?",
    "Wap air ialah gas, manakala titisan air ialah cecair.",
  ],
  [
    "Bagaimanakah kita boleh menjimatkan air?",
    "Tutup paip selepas digunakan dan baiki kebocoran dengan segera.",
  ],
  [
    "Mengapakah air perlu dirawat sebelum diminum?",
    "Rawatan menyingkirkan bahan pencemar dan mikroorganisma berbahaya.",
  ],
];

export function AppPreview() {
  const [position, setPosition] = useState(11);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<number[]>([]);
  const reducedMotion = useReducedMotion();
  const card = CARDS[position];
  const go = (delta: number) => {
    setFlipped(false);
    setPosition((value) => (value + delta + CARDS.length) % CARDS.length);
  };
  const mark = (mastered: boolean) => {
    setKnown((value) =>
      mastered
        ? [...new Set([...value, position])]
        : value.filter((index) => index !== position),
    );
    go(1);
  };
  return (
    <div
      className={s.heroVisual}
      id="demo"
      tabIndex={-1}
      aria-label="Demo kad imbas interaktif"
    >
      <div className={s.demoPanel}>
        <div className={s.demoTop}>
          <span>
            <DropletsIcon aria-hidden="true" />
            Sains Tingkatan 2 › Kitaran Air
          </span>
          <span className={s.demoPosition} aria-live="polite">
            {position + 1} / {CARDS.length}
          </span>
        </div>
        <div
          className={s.demoProgress}
          role="progressbar"
          aria-label="Kemajuan demo"
          aria-valuemin={0}
          aria-valuemax={20}
          aria-valuenow={position + 1}
        >
          <span
            style={{ width: `${((position + 1) / CARDS.length) * 100}%` }}
          />
        </div>
        <div className={s.cardStage}>
          <Button
            variant="ghost"
            size="icon"
            className={s.demoPrev}
            aria-label="Kad demo sebelumnya"
            onClick={() => go(-1)}
          >
            <ChevronLeftIcon />
          </Button>
          <button
            type="button"
            className={s.demoCard}
            onClick={() => setFlipped((value) => !value)}
            aria-label={flipped ? "Lihat soalan demo" : "Lihat jawapan demo"}
            aria-pressed={flipped}
          >
            <motion.span
              className={s.demoCardInner}
              initial={false}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.45 }}
            >
              <span className={s.demoFront} aria-hidden={flipped}>
                <span className={s.demoTag}>ISTILAH</span>
                <span className={s.demoQuestionLabel}>SOALAN</span>
                <span>{card[0]}</span>
              </span>
              <span className={s.demoBack} aria-hidden={!flipped}>
                <span className={s.demoQuestionLabel}>JAWAPAN</span>
                <span>{card[1]}</span>
              </span>
            </motion.span>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className={s.demoNext}
            aria-label="Kad demo seterusnya"
            onClick={() => go(1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <div className={s.demoLearning}>
          <Button
            variant="outline"
            onClick={() => mark(false)}
            className={s.demoAgain}
          >
            Masih Belajar
          </Button>
          <Button onClick={() => mark(true)} className={s.demoKnown}>
            <CheckIcon />
            Sudah Faham
          </Button>
        </div>
        <span className="sr-only" role="status">
          {known.length} kad demo dikuasai
        </span>
      </div>
      <SparklesIcon className={s.heroSparkles} aria-hidden="true" />
      <Image
        src="/landing/study-robot.png"
        alt="Robot pembelajaran Pixelspace memakai topi graduasi dan membaca buku"
        width={400}
        height={520}
        className={s.heroRobot}
        priority
      />
    </div>
  );
}
