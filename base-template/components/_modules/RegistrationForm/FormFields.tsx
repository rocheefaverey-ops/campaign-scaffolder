const inputClass =
  'w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-[var(--color-primary)] focus:outline-none';

export default function FormFields() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm opacity-70">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className={inputClass}
          placeholder="Your name"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm opacity-70">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          placeholder="your@email.com"
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input name="optin" type="checkbox" className="mt-0.5" />
        <span className="opacity-70">
          I agree to receive updates about this campaign.
        </span>
      </label>
    </>
  );
}
