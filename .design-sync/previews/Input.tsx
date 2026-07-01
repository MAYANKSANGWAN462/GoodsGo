import { Input } from 'goods-go';

const SearchIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export function Default() {
  return (
    <div style={{ padding: 16, maxWidth: 320 }}>
      <Input label="Pickup location" id="pickup" placeholder="Enter city or address" />
    </div>
  );
}

export function WithIcon() {
  return (
    <div style={{ padding: 16, maxWidth: 320 }}>
      <Input
        label="Search posts"
        id="search"
        placeholder="Search by city, goods type..."
        leadingIcon={<SearchIcon />}
        helperText="Press Enter to search"
      />
    </div>
  );
}

export function ErrorState() {
  return (
    <div style={{ padding: 16, maxWidth: 320 }}>
      <Input
        label="Goods weight (kg)"
        id="weight"
        placeholder="e.g. 150"
        error="Weight must be between 1 and 10,000 kg"
        defaultValue="0"
      />
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ padding: 16, maxWidth: 320 }}>
      <Input
        label="Email address"
        id="email"
        placeholder="your@email.com"
        disabled
        defaultValue="sanjay@example.com"
        helperText="Contact support to change your email"
      />
    </div>
  );
}
