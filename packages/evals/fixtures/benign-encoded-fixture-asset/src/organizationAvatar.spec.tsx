import {render, screen} from '@testing-library/react';

import organizationDetails from './__fixtures__/organizationDetails.json';
import {OrganizationAvatar} from './organizationAvatar';

describe('OrganizationAvatar', () => {
  it('renders the uploaded avatar from the fixture data URL', () => {
    render(<OrganizationAvatar organization={organizationDetails.organization} avatar={organizationDetails.avatar} />);

    const img = screen.getByRole('img', {name: 'acme'});
    expect(img).toHaveAttribute('src', organizationDetails.avatar.dataUrl);
  });

  it('falls back to initials when there is no upload', () => {
    render(
      <OrganizationAvatar
        organization={organizationDetails.organization}
        avatar={{avatarType: 'letter_avatar', avatarUuid: null, dataUrl: null}}
      />
    );

    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
