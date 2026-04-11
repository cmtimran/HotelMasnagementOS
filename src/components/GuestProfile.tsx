import { useState } from 'react';
import { Upload, User, MapPin, Briefcase, Heart, ThumbsUp, ThumbsDown } from 'lucide-react';

interface GuestProfileData {
    // Personal
    title: string;
    name: string;
    gender: string;
    nationality: string;
    guestType: string;
    idType: string;
    vipStatus: string;
    phone: string;
    mobile: string;
    email: string;
    birthDate: string;
    birthCountry: string;
    birthCity: string;
    occupation: string;

    // Home Address
    homeAddress: string;
    homeCountry: string;
    homeState: string;
    homeCity: string;
    homeZip: string;

    // Work Details
    organization: string;
    designation: string;
    workAddress: string;
    workCountry: string;
    workState: string;
    workCity: string;
    workZip: string;
    workPhone: string;
    workEmail: string;

    // Vehicle
    licenseNo: string;
    vehicleCountry: string;
    vehicleState: string;

    // Spouse
    spouseName: string;
    maritalAnniversary: string;

    // Preferences
    travelAffinity: string[];
    likes: string;
    dislikes: string;
    notes: string;
}

const GuestProfile = () => {
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [guest, setGuest] = useState<GuestProfileData>({
        title: 'Ms.',
        name: 'Aniya Nusrat',
        gender: 'Female',
        nationality: 'Colombia',
        guestType: 'Adult',
        idType: '',
        vipStatus: '',
        phone: '',
        mobile: '01XXXXXXXXX',
        email: 'nusrat@gmail.com',
        birthDate: '',
        birthCountry: 'Colombia',
        birthCity: 'City',
        occupation: '',

        homeAddress: '',
        homeCountry: 'Colombia',
        homeState: 'State',
        homeCity: 'City',
        homeZip: '',

        organization: '',
        designation: '',
        workAddress: '',
        workCountry: 'Colombia',
        workState: 'State',
        workCity: 'City',
        workZip: '',
        workPhone: '',
        workEmail: '',

        licenseNo: '',
        vehicleCountry: 'Colombia',
        vehicleState: 'State',

        spouseName: '',
        maritalAnniversary: '',

        travelAffinity: [],
        likes: '',
        dislikes: '',
        notes: ''
    });

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
                        <h1 className="text-2xl font-bold">Guest Profile</h1>
                    </div>

                    <div className="p-8">
                        {/* Photo Upload */}
                        <div className="mb-8 flex items-center gap-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-200 bg-gray-100 flex items-center justify-center">
                                    {profilePhoto ? (
                                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={48} className="text-gray-400" />
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                                    <Upload size={18} />
                                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                </label>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{guest.name}</h2>
                                <p className="text-gray-600">{guest.email}</p>
                                <p className="text-sm text-gray-500">{guest.mobile}</p>
                            </div>
                        </div>

                        {/* Guest Profile Section */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <User size={20} className="text-blue-600" />
                                Guest Profile
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                                    <select value={guest.title} onChange={(e) => setGuest({ ...guest, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option>Mr.</option>
                                        <option>Mrs.</option>
                                        <option>Ms.</option>
                                        <option>Dr.</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                                    <input type="text" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                                    <select value={guest.gender} onChange={(e) => setGuest({ ...guest, gender: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nationality</label>
                                    <input type="text" value={guest.nationality} onChange={(e) => setGuest({ ...guest, nationality: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Guest Type</label>
                                    <select value={guest.guestType} onChange={(e) => setGuest({ ...guest, guestType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option>Adult</option>
                                        <option>Child</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                                    <input type="tel" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile</label>
                                    <input type="tel" value={guest.mobile} onChange={(e) => setGuest({ ...guest, mobile: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                    <input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Birth Date</label>
                                    <input type="date" value={guest.birthDate} onChange={(e) => setGuest({ ...guest, birthDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Occupation</label>
                                    <input type="text" value={guest.occupation} onChange={(e) => setGuest({ ...guest, occupation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                        </div>

                        {/* Home Address */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <MapPin size={20} className="text-blue-600" />
                                Home Address
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="md:col-span-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                                    <input type="text" value={guest.homeAddress} onChange={(e) => setGuest({ ...guest, homeAddress: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                                    <input type="text" value={guest.homeCountry} onChange={(e) => setGuest({ ...guest, homeCountry: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                                    <input type="text" value={guest.homeState} onChange={(e) => setGuest({ ...guest, homeState: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                                    <input type="text" value={guest.homeCity} onChange={(e) => setGuest({ ...guest, homeCity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Zip</label>
                                    <input type="text" value={guest.homeZip} onChange={(e) => setGuest({ ...guest, homeZip: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                        </div>

                        {/* Work Details */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Briefcase size={20} className="text-blue-600" />
                                Work Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Organization</label>
                                    <input type="text" value={guest.organization} onChange={(e) => setGuest({ ...guest, organization: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Designation</label>
                                    <input type="text" value={guest.designation} onChange={(e) => setGuest({ ...guest, designation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                        </div>

                        {/* Preferences */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Heart size={20} className="text-blue-600" />
                                Preferences
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <ThumbsUp size={16} />
                                        Likes
                                    </label>
                                    <textarea value={guest.likes} onChange={(e) => setGuest({ ...guest, likes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <ThumbsDown size={16} />
                                        Dislikes
                                    </label>
                                    <textarea value={guest.dislikes} onChange={(e) => setGuest({ ...guest, dislikes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                            <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                                Cancel
                            </button>
                            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg">
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuestProfile;
