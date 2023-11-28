import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center py-6">
                    <div className="flex items-center">
                        <a href="https://agilemerchants.com" className="flex-shrink-0">
                            <img
                                src="https://agilemerchants.com/content/images/2023/11/Logo-Version-1.png"
                                alt="Agile Merchants"
                                className="h-10 w-auto"
                            />
                        </a>
                        <nav className="ml-6 space-x-4">
                            <a href="https://agilemerchants.com/tag/chatgpt/" className="text-gray-700 hover:text-gray-900">
                                ChatGPT
                            </a>
                            <a href="https://agilemerchants.com/tag/artificial-intelligence/" className="text-gray-700 hover:text-gray-900">
                                Artificial Intelligence
                            </a>
                            <a href="https://agilemerchants.com/tag/tools/" className="text-gray-700 hover:text-gray-900">
                                Other Tools
                            </a>
                        </nav>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;