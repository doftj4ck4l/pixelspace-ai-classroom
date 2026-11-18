import { type FC } from "react";

type PagePlaceholderProps = {
  title: string;
  description: string;
};

export const PagePlaceholder: FC<PagePlaceholderProps> = ({
  title,
  description,
}) => {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-[#fdfcfc] px-4 text-[#1f1f1f] dark:bg-[#0c0c0c] dark:text-[#e3e3e3]">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 size-11 rounded-full bg-gradient-to-br from-[#177e89] to-[#8fd9c8]" />
        <h1 className="text-lg font-medium">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        <a
          href="/"
          className="text-primary mt-6 text-sm underline-offset-4 hover:underline"
        >
          Back to classroom
        </a>
      </div>
    </main>
  );
};
