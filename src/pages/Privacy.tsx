import { Link } from "react-router-dom";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "আমরা কী তথ্য রাখি",
    body: [
      "অ্যাকাউন্ট খোলা ও লগইনের জন্য আপনার মোবাইল নম্বর এবং পিন (পিন এনক্রিপ্টেড আকারে) আমাদের সার্ভারে (Supabase) থাকে।",
      "আপনার দোকানের হিসাব, পণ্য, স্টক, কাস্টমার ও বাকির তথ্য শুধু আপনার ফোনের ব্রাউজার/অ্যাপ স্টোরেজে থাকে। এগুলো আমাদের সার্ভারে পাঠানো হয় না।",
    ],
  },
  {
    title: "তথ্য কীভাবে ব্যবহার হয়",
    body: [
      "মোবাইল নম্বর ও পিন শুধু আপনাকে সাইন আপ ও লগইন করাতে ব্যবহার হয়। বিজ্ঞাপন, ট্র্যাকিং বা বিশ্লেষণের জন্য ব্যবহার করা হয় না।",
      "আমরা কোনো তথ্য বিক্রি বা তৃতীয় পক্ষকে দিই না।",
    ],
  },
  {
    title: "ইন্টারনেট ব্যবহার",
    body: [
      "সাইন আপ, প্রথমবার লগইন এবং অ্যাপের নতুন ভার্সন ডাউনলোডের সময় ইন্টারনেট লাগে। লগইন করা থাকলে বাকি সব কাজ অফলাইনে চলে।",
    ],
  },
  {
    title: "ডেটা মুছে ফেলা",
    body: [
      "ফোনের অ্যাপ আনইনস্টল করলে বা অ্যাপের ডেটা ক্লিয়ার করলে দোকানের সব তথ্য মুছে যায়। অ্যাকাউন্ট (মোবাইল নম্বর) মুছে ফেলতে চাইলে আমাদের জানান, আমরা সার্ভার থেকে তা সরিয়ে দেব।",
    ],
  },
  {
    title: "যোগাযোগ",
    body: ["প্রশ্ন বা অনুরোধের জন্য: https://hisab-nikash.userheaven.app"],
  },
];

export default function Privacy() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-background px-4 py-8 text-foreground">
      <h1 className="text-2xl font-bold">গোপনীয়তা নীতি</h1>
      <p className="mt-1 text-sm text-muted-foreground">হিসাব নিকাশ · সর্বশেষ হালনাগাদ: ২১ নভেম্বর ২০২৬</p>
      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-6">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          {s.body.map((p) => (
            <p key={p} className="mt-2 text-sm leading-relaxed">{p}</p>
          ))}
        </section>
      ))}
      <Link to="/login" className="mt-8 inline-block text-sm text-primary underline">
        অ্যাপে ফিরে যান
      </Link>
    </main>
  );
}
